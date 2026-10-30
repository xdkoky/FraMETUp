"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canRespondToRequest } from "@/lib/auth/policy";
import { toViewer } from "@/lib/services/access";
import { audit } from "@/lib/services/audit";
import { recomputeMastery } from "@/lib/services/mastery";
import { notify } from "@/lib/services/notifications";
import { awardXp } from "@/lib/services/xp";
import { rateLimit } from "@/lib/rate-limit";

export type FeedbackState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

const RequestSchema = z.object({
  reviewerEmail: z.string().trim().toLowerCase().email("Enter the reviewer's FraMETUp email."),
  projectId: z.string().optional().transform((v) => v || null),
  reviewerRelation: z.string().trim().min(2, "Describe their role, e.g. Cinematographer.").max(80),
  message: z.string().trim().max(1000).optional().transform((v) => v || null),
  skillIds: z.array(z.string()).min(1, "Choose at least one skill they actually observed.").max(6, "Ask about six skills at most — focused requests get better feedback."),
});

export async function requestFeedback(_: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const user = await requireUser();
  if (!rateLimit(`review-request:${user.id}`, 20, 86400_000).ok) return { error: "You've sent many requests today. Please try again tomorrow." };
  const parsed = RequestSchema.safeParse({
    reviewerEmail: formData.get("reviewerEmail"),
    projectId: formData.get("projectId") ?? undefined,
    reviewerRelation: formData.get("reviewerRelation"),
    message: formData.get("message") ?? undefined,
    skillIds: formData.getAll("skillIds"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  // Same message whether the account doesn't exist or has opted out — no account enumeration.
  const reviewer = await db.user.findFirst({ where: { email: d.reviewerEmail, deletedAt: null }, include: { privacy: true } });
  if (!reviewer || reviewer.privacy?.allowReviewRequests === false) {
    return { fieldErrors: { reviewerEmail: ["We couldn't send a request to that address. Check it's their FraMETUp email."] } };
  }
  if (reviewer.id === user.id) return { fieldErrors: { reviewerEmail: ["Use self-assessment for your own view."] } };
  if (d.projectId && !(await db.project.findFirst({ where: { id: d.projectId, ownerId: user.id, deletedAt: null } }))) {
    return { error: "Project not found." };
  }
  const validSkills = await db.skill.findMany({ where: { id: { in: d.skillIds } }, select: { id: true } });
  if (validSkills.length !== d.skillIds.length) return { error: "Unknown skill selected." };

  const duplicate = await db.peerReviewRequest.findFirst({
    where: { requesterId: user.id, reviewerId: reviewer.id, projectId: d.projectId, status: "PENDING" },
  });
  if (duplicate) return { error: "You already have a pending request with this person for this project." };

  const req = await db.peerReviewRequest.create({
    data: {
      requesterId: user.id,
      reviewerId: reviewer.id,
      projectId: d.projectId,
      reviewerRelation: d.reviewerRelation,
      message: d.message,
      skills: { create: d.skillIds.map((skillId) => ({ skillId })) },
    },
  });
  await notify(reviewer.id, "REVIEW_REQUESTED", `${user.displayName} asked for your feedback`, `${d.skillIds.length} skills`, `/feedback/review/${req.id}`);
  await audit(user.id, "feedback.request", "PeerReviewRequest", req.id);
  redirect("/feedback?sent=1");
}

const OBS = ["NOT_OBSERVED", "INSUFFICIENT_EVIDENCE", "OBSERVED_WITH_DIFFICULTY", "DEMONSTRATED_WITH_SUPPORT", "DEMONSTRATED_INDEPENDENTLY", "DEMONSTRATED_CONSISTENTLY"] as const;

export async function submitReview(requestId: string, _: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const user = await requireUser();
  const req = await db.peerReviewRequest.findUnique({ where: { id: requestId }, include: { skills: true } });
  if (!req || !canRespondToRequest(await toViewer(user), req)) return { error: "This request is no longer open." };

  const familiarity = z.enum(["BRIEF", "WORKED_ALONGSIDE", "CLOSE_COLLABORATOR"]).safeParse(formData.get("familiarity"));
  if (!familiarity.success) return { error: "Tell us how closely you worked together." };

  const items: { skillId: string; observation: (typeof OBS)[number]; comment: string | null; example: string | null }[] = [];
  for (const s of req.skills) {
    const obs = z.enum(OBS).safeParse(formData.get(`obs:${s.skillId}`));
    if (!obs.success) return { error: "Choose an option for every skill — “Not observed” is a perfectly good answer." };
    const comment = String(formData.get(`comment:${s.skillId}`) ?? "").trim().slice(0, 2000) || null;
    const example = String(formData.get(`example:${s.skillId}`) ?? "").trim().slice(0, 2000) || null;
    items.push({ skillId: s.skillId, observation: obs.data, comment, example });
  }
  const rubrics = await db.skillRubric.findMany({ where: { skillId: { in: items.map((i) => i.skillId) }, isCurrent: true } });
  const rubricBySkill = new Map(rubrics.map((r) => [r.skillId, r.id]));

  const review = await db.$transaction(async (tx) => {
    const r = await tx.peerReview.create({
      data: {
        requestId: req.id,
        reviewerId: user.id,
        subjectId: req.requesterId,
        projectId: req.projectId,
        familiarity: familiarity.data,
        overallComment: String(formData.get("overallComment") ?? "").trim().slice(0, 3000) || null,
        anonymousToSubject: formData.get("anonymous") === "on",
        items: { create: items.map((i) => ({ ...i, rubricId: rubricBySkill.get(i.skillId)! })) },
      },
    });
    await tx.peerReviewRequest.update({ where: { id: req.id }, data: { status: "COMPLETED", respondedAt: new Date() } });
    return r;
  });

  await awardXp(user.id, "REVIEW_GIVEN", review.id);
  await awardXp(req.requesterId, "FEEDBACK_RECEIVED", review.id);
  await recomputeMastery(req.requesterId, items.map((i) => i.skillId));
  await notify(req.requesterId, "REVIEW_RECEIVED", "You received new feedback", review.anonymousToSubject ? "From an anonymous collaborator" : `From ${user.displayName}`, "/feedback");
  await audit(user.id, "feedback.submit", "PeerReview", review.id);
  redirect("/feedback?reviewed=1");
}

export async function declineRequest(requestId: string) {
  const user = await requireUser();
  const req = await db.peerReviewRequest.findUnique({ where: { id: requestId } });
  if (!req || !canRespondToRequest(await toViewer(user), req)) return;
  await db.peerReviewRequest.update({ where: { id: requestId }, data: { status: "DECLINED", respondedAt: new Date() } });
  // The requester is told it was declined, with no reason — protects reviewers from pressure.
  await notify(req.requesterId, "REVIEW_DECLINED", "A feedback request was declined", "No reason is shared. Consider asking someone else who observed the work.", "/feedback");
  revalidatePath("/feedback");
}

export async function cancelRequest(requestId: string) {
  const user = await requireUser();
  await db.peerReviewRequest.updateMany({ where: { id: requestId, requesterId: user.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  revalidatePath("/feedback");
}
