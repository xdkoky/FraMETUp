import "server-only";
import { db } from "@/lib/db";
import { deleteUpload } from "@/lib/uploads";
import { recomputeMastery } from "./mastery";

/** Everything stored about a user, for GDPR data portability. */
export async function exportUserData(userId: string) {
  const [user, projects, selfAssessments, reviewsReceived, reviewsWritten, requests, reflections, goals, xp, snapshots, ai, challenges, notifications] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true, createdAt: true, profile: true, privacy: true, roles: { include: { role: true } }, memberships: { include: { cohort: true } } } }),
    db.project.findMany({ where: { ownerId: userId }, include: { collaborators: true, evidence: true, skillLinks: true } }),
    db.selfAssessment.findMany({ where: { userId } }),
    db.peerReview.findMany({ where: { subjectId: userId }, include: { items: true } }),
    db.peerReview.findMany({ where: { reviewerId: userId }, include: { items: true } }),
    db.peerReviewRequest.findMany({ where: { OR: [{ requesterId: userId }, { reviewerId: userId }] }, include: { skills: true } }),
    db.reflection.findMany({ where: { userId } }),
    db.learningGoal.findMany({ where: { userId }, include: { skills: true } }),
    db.experienceEvent.findMany({ where: { userId } }),
    db.masterySnapshot.findMany({ where: { userId } }),
    db.aIAssessment.findMany({ where: { userId }, include: { suggestions: true } }),
    db.challengeCompletion.findMany({ where: { userId } }),
    db.notification.findMany({ where: { userId } }),
  ]);
  // Anonymous reviewers stay anonymous in the export.
  const received = reviewsReceived.map((r) => (r.anonymousToSubject ? { ...r, reviewerId: "anonymous" } : r));
  return {
    exportedAt: new Date().toISOString(),
    format: "frametup-export-v1",
    note: "Uploaded files are listed by metadata; download them individually from each project.",
    user,
    projects,
    selfAssessments,
    peerReviewsReceived: received,
    peerReviewsWritten: reviewsWritten,
    reviewRequests: requests,
    reflections,
    learningGoals: goals,
    experienceEvents: xp,
    masterySnapshots: snapshots,
    aiAssessments: ai,
    challengeCompletions: challenges,
    notifications,
  };
}

/** Permanently erases a user and their content (right to erasure). */
export async function deleteAccount(userId: string) {
  const files = await db.projectEvidence.findMany({ where: { project: { ownerId: userId }, storageKey: { not: null } }, select: { storageKey: true } });
  const affectedSubjects = await db.peerReview.findMany({ where: { reviewerId: userId }, select: { subjectId: true } });

  await db.$transaction(async (tx) => {
    const myRequests = await tx.peerReviewRequest.findMany({ where: { OR: [{ requesterId: userId }, { reviewerId: userId }] }, select: { id: true } });
    const requestIds = myRequests.map((r) => r.id);
    const projectIds = (await tx.project.findMany({ where: { ownerId: userId }, select: { id: true } })).map((p) => p.id);
    const reviewIds = (
      await tx.peerReview.findMany({ where: { OR: [{ reviewerId: userId }, { subjectId: userId }, { requestId: { in: requestIds } }, { projectId: { in: projectIds } }] }, select: { id: true } })
    ).map((r) => r.id);
    await tx.peerReview.deleteMany({ where: { id: { in: reviewIds } } });
    await tx.peerReviewRequest.deleteMany({ where: { OR: [{ id: { in: requestIds } }, { projectId: { in: projectIds } }] } });
    await tx.instructorAssessment.deleteMany({ where: { OR: [{ studentId: userId }, { instructorId: userId }] } });
    await tx.challengeCompletion.deleteMany({ where: { OR: [{ userId }, { projectId: { in: projectIds } }] } });
    await tx.reflection.deleteMany({ where: { OR: [{ userId }, { projectId: { in: projectIds } }] } });
    await tx.project.deleteMany({ where: { ownerId: userId } });
    await tx.projectCollaborator.updateMany({ where: { userId }, data: { userId: null } });
    await tx.challenge.updateMany({ where: { createdById: userId }, data: { createdById: null } });
    await tx.user.delete({ where: { id: userId } });
    await tx.auditLog.create({ data: { action: "account.delete", targetType: "User", targetId: userId } });
  });
  for (const f of files) if (f.storageKey) await deleteUpload(f.storageKey);
  // Other students' estimates no longer include the deleted reviewer's feedback.
  for (const s of new Set(affectedSubjects.map((a) => a.subjectId))) await recomputeMastery(s);
}
