import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { canEditProject, canViewProject, type Viewer } from "@/lib/auth/policy";

export async function toViewer(user: CurrentUser): Promise<Viewer> {
  const memberships = await db.cohortMembership.findMany({ where: { userId: user.id }, select: { cohortId: true } });
  return { id: user.id, roles: user.roles, cohortIds: memberships.map((m) => m.cohortId) };
}

async function projectFacts(projectId: string) {
  const p = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      visibility: true,
      deletedAt: true,
      collaborators: { select: { userId: true } },
      reviewRequests: { where: { status: { in: ["PENDING", "COMPLETED"] } }, select: { reviewerId: true } },
      owner: { select: { memberships: { select: { cohortId: true } } } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    ownerId: p.ownerId,
    visibility: p.visibility,
    deletedAt: p.deletedAt,
    collaboratorUserIds: p.collaborators.map((c) => c.userId).filter((x): x is string => Boolean(x)),
    reviewerUserIds: p.reviewRequests.map((r) => r.reviewerId),
    ownerCohortIds: p.owner.memberships.map((m) => m.cohortId),
  };
}

/** Throws notFound() (not 403) so unauthorised users can't probe for existence. */
export async function assertCanViewProject(user: CurrentUser, projectId: string) {
  const facts = await projectFacts(projectId);
  if (!facts || !canViewProject(await toViewer(user), facts)) notFound();
  return facts;
}

export async function assertCanEditProject(user: CurrentUser, projectId: string) {
  const facts = await projectFacts(projectId);
  if (!facts || !canEditProject(await toViewer(user), facts)) notFound();
  return facts;
}
