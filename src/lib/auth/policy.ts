/**
 * Authorization policies — pure functions over plain data so they can be unit
 * tested exhaustively. Every server read/write of protected data goes through these.
 */

export type VisibilityValue = "PRIVATE" | "COLLABORATORS" | "COHORT";

export interface Viewer {
  id: string;
  roles: string[];
  cohortIds: string[];
}

export interface ProjectAccessFacts {
  ownerId: string;
  visibility: VisibilityValue;
  deletedAt: Date | null;
  collaboratorUserIds: string[];
  /** reviewers with a pending or completed request on this project */
  reviewerUserIds: string[];
  ownerCohortIds: string[];
}

export function canViewProject(viewer: Viewer, p: ProjectAccessFacts): boolean {
  if (p.deletedAt) return viewer.id === p.ownerId;
  if (viewer.id === p.ownerId) return true;
  if (p.reviewerUserIds.includes(viewer.id)) return true;
  if (p.visibility === "PRIVATE") return false;
  if (p.collaboratorUserIds.includes(viewer.id)) return true;
  if (p.visibility === "COHORT") return viewer.cohortIds.some((c) => p.ownerCohortIds.includes(c));
  return false;
}

export function canEditProject(viewer: Viewer, p: Pick<ProjectAccessFacts, "ownerId" | "deletedAt">): boolean {
  return viewer.id === p.ownerId && !p.deletedAt;
}

export interface ReviewAccessFacts {
  reviewerId: string;
  subjectId: string;
  anonymousToSubject: boolean;
}

/** Peer feedback is private: only the reviewer and the subject can read it. */
export function canViewReview(viewer: Viewer, r: ReviewAccessFacts): boolean {
  return viewer.id === r.reviewerId || viewer.id === r.subjectId;
}

/** Whether the viewer may learn who wrote the review. */
export function canSeeReviewerIdentity(viewer: Viewer, r: ReviewAccessFacts): boolean {
  if (viewer.id === r.reviewerId) return true;
  return viewer.id === r.subjectId && !r.anonymousToSubject;
}

export interface ReflectionAccessFacts {
  ownerId: string;
  visibility: VisibilityValue;
  deletedAt: Date | null;
  projectCollaboratorUserIds: string[];
}

/** Reflections are private by default; COLLABORATORS shares with project collaborators only. */
export function canViewReflection(viewer: Viewer, r: ReflectionAccessFacts): boolean {
  if (r.deletedAt) return false;
  if (viewer.id === r.ownerId) return true;
  return r.visibility === "COLLABORATORS" && r.projectCollaboratorUserIds.includes(viewer.id);
}

export interface RequestFacts {
  requesterId: string;
  reviewerId: string;
  status: "PENDING" | "COMPLETED" | "DECLINED" | "CANCELLED";
}

export function canRespondToRequest(viewer: Viewer, r: RequestFacts): boolean {
  return viewer.id === r.reviewerId && r.status === "PENDING";
}

export function canAdministerTaxonomy(viewer: Viewer): boolean {
  return viewer.roles.includes("ADMIN");
}

/** Mastery snapshots and self-assessments are only ever visible to their owner. */
export function canViewDevelopmentData(viewer: Viewer, ownerId: string): boolean {
  return viewer.id === ownerId;
}

// ── Lesson photos ──

export interface LessonMediaFacts {
  kind: "REFERENCE" | "EXAMPLE";
  visibility: "PRIVATE" | "SHARED";
  uploaderId: string;
  deletedAt: Date | null;
  uploaderCohortIds: string[];
}

const isStaff = (v: Viewer) => v.roles.includes("INSTRUCTOR") || v.roles.includes("ADMIN");

/** Instructors and admins curate the reference pictures every student sees. */
export function canCurateLessonMedia(viewer: Viewer): boolean {
  return isStaff(viewer);
}

/**
 * References are visible to everyone signed in. A student's example is private to them;
 * if they share it, classmates in a shared cohort and staff can see it.
 */
export function canViewLessonMedia(viewer: Viewer, m: LessonMediaFacts): boolean {
  if (m.deletedAt) return false;
  if (m.kind === "REFERENCE") return true;
  if (viewer.id === m.uploaderId) return true;
  if (m.visibility !== "SHARED") return false;
  return isStaff(viewer) || viewer.cohortIds.some((c) => m.uploaderCohortIds.includes(c));
}

/** Uploaders can manage their own pictures; staff can manage references and moderate shared examples. */
export function canManageLessonMedia(viewer: Viewer, m: Pick<LessonMediaFacts, "kind" | "visibility" | "uploaderId" | "deletedAt">): boolean {
  if (m.deletedAt) return false;
  if (viewer.id === m.uploaderId) return true;
  return isStaff(viewer) && (m.kind === "REFERENCE" || m.visibility === "SHARED");
}
