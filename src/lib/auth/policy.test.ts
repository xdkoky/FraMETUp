import { describe, expect, it } from "vitest";
import {
  canAdministerTaxonomy,
  canCurateLessonMedia,
  canManageLessonMedia,
  canViewLessonMedia,
  canEditProject,
  canRespondToRequest,
  canSeeReviewerIdentity,
  canViewDevelopmentData,
  canViewProject,
  canViewReflection,
  canViewReview,
  type ProjectAccessFacts,
  type Viewer,
} from "./policy";

const owner: Viewer = { id: "owner", roles: ["STUDENT"], cohortIds: ["c1"] };
const stranger: Viewer = { id: "stranger", roles: ["STUDENT"], cohortIds: ["c2"] };
const classmate: Viewer = { id: "classmate", roles: ["STUDENT"], cohortIds: ["c1"] };
const collaborator: Viewer = { id: "collab", roles: ["STUDENT"], cohortIds: ["c2"] };
const reviewer: Viewer = { id: "rev", roles: ["STUDENT"], cohortIds: [] };
const admin: Viewer = { id: "admin", roles: ["ADMIN"], cohortIds: [] };

const project = (over: Partial<ProjectAccessFacts> = {}): ProjectAccessFacts => ({
  ownerId: "owner",
  visibility: "PRIVATE",
  deletedAt: null,
  collaboratorUserIds: ["collab"],
  reviewerUserIds: ["rev"],
  ownerCohortIds: ["c1"],
  ...over,
});

describe("project access", () => {
  it("private projects are visible only to owner and invited reviewers", () => {
    expect(canViewProject(owner, project())).toBe(true);
    expect(canViewProject(reviewer, project())).toBe(true);
    expect(canViewProject(stranger, project())).toBe(false);
    expect(canViewProject(classmate, project())).toBe(false);
    expect(canViewProject(collaborator, project())).toBe(false);
    expect(canViewProject(admin, project())).toBe(false);
  });

  it("collaborator visibility admits collaborators only", () => {
    const p = project({ visibility: "COLLABORATORS" });
    expect(canViewProject(collaborator, p)).toBe(true);
    expect(canViewProject(classmate, p)).toBe(false);
  });

  it("cohort visibility admits the same cohort", () => {
    const p = project({ visibility: "COHORT" });
    expect(canViewProject(classmate, p)).toBe(true);
    expect(canViewProject(stranger, p)).toBe(false);
  });

  it("soft-deleted projects are hidden from everyone but the owner", () => {
    const p = project({ visibility: "COHORT", deletedAt: new Date() });
    expect(canViewProject(classmate, p)).toBe(false);
    expect(canViewProject(reviewer, p)).toBe(false);
    expect(canViewProject(owner, p)).toBe(true);
  });

  it("only the owner can edit", () => {
    expect(canEditProject(owner, project())).toBe(true);
    expect(canEditProject(collaborator, project({ visibility: "COLLABORATORS" }))).toBe(false);
    expect(canEditProject(admin, project())).toBe(false);
  });
});

describe("peer feedback privacy", () => {
  const review = { reviewerId: "rev", subjectId: "owner", anonymousToSubject: true };
  it("is visible only to reviewer and subject", () => {
    expect(canViewReview(reviewer, review)).toBe(true);
    expect(canViewReview(owner, review)).toBe(true);
    expect(canViewReview(classmate, review)).toBe(false);
    expect(canViewReview(admin, review)).toBe(false);
  });
  it("hides anonymous reviewer identity from the subject", () => {
    expect(canSeeReviewerIdentity(owner, review)).toBe(false);
    expect(canSeeReviewerIdentity(owner, { ...review, anonymousToSubject: false })).toBe(true);
    expect(canSeeReviewerIdentity(reviewer, review)).toBe(true);
  });
  it("only the invited reviewer can respond, and only while pending", () => {
    const req = { requesterId: "owner", reviewerId: "rev", status: "PENDING" as const };
    expect(canRespondToRequest(reviewer, req)).toBe(true);
    expect(canRespondToRequest(owner, req)).toBe(false);
    expect(canRespondToRequest(reviewer, { ...req, status: "COMPLETED" })).toBe(false);
  });
});

describe("reflections and development data", () => {
  const refl = { ownerId: "owner", visibility: "PRIVATE" as const, deletedAt: null, projectCollaboratorUserIds: ["collab"] };
  it("reflections are private by default", () => {
    expect(canViewReflection(owner, refl)).toBe(true);
    expect(canViewReflection(collaborator, refl)).toBe(false);
    expect(canViewReflection(collaborator, { ...refl, visibility: "COLLABORATORS" })).toBe(true);
    expect(canViewReflection(classmate, { ...refl, visibility: "COLLABORATORS" })).toBe(false);
  });
  it("mastery data is owner-only, even for admins", () => {
    expect(canViewDevelopmentData(owner, "owner")).toBe(true);
    expect(canViewDevelopmentData(admin, "owner")).toBe(false);
  });
  it("taxonomy administration requires ADMIN", () => {
    expect(canAdministerTaxonomy(admin)).toBe(true);
    expect(canAdministerTaxonomy(owner)).toBe(false);
  });
});

describe("lesson photos", () => {
  const student = { id: "s1", roles: ["STUDENT"], cohortIds: ["c1"] };
  const classmate = { id: "s2", roles: ["STUDENT"], cohortIds: ["c1"] };
  const stranger = { id: "s3", roles: ["STUDENT"], cohortIds: ["c9"] };
  const teacher = { id: "t1", roles: ["INSTRUCTOR"], cohortIds: [] };
  const example = { kind: "EXAMPLE" as const, visibility: "PRIVATE" as const, uploaderId: "s1", deletedAt: null, uploaderCohortIds: ["c1"] };

  it("keeps private examples to the uploader", () => {
    expect(canViewLessonMedia(student, example)).toBe(true);
    expect(canViewLessonMedia(classmate, example)).toBe(false);
    expect(canViewLessonMedia(teacher, example)).toBe(false);
  });

  it("shows shared examples to classmates and staff only", () => {
    const shared = { ...example, visibility: "SHARED" as const };
    expect(canViewLessonMedia(classmate, shared)).toBe(true);
    expect(canViewLessonMedia(teacher, shared)).toBe(true);
    expect(canViewLessonMedia(stranger, shared)).toBe(false);
  });

  it("shows references to everyone and hides deleted pictures", () => {
    const ref = { ...example, kind: "REFERENCE" as const, uploaderId: "t1" };
    expect(canViewLessonMedia(stranger, ref)).toBe(true);
    expect(canViewLessonMedia(student, { ...example, deletedAt: new Date() })).toBe(false);
  });

  it("lets only staff curate, and staff moderate only what they can see", () => {
    expect(canCurateLessonMedia(teacher)).toBe(true);
    expect(canCurateLessonMedia(student)).toBe(false);
    expect(canManageLessonMedia(student, example)).toBe(true);
    expect(canManageLessonMedia(classmate, example)).toBe(false);
    expect(canManageLessonMedia(teacher, example)).toBe(false);
    expect(canManageLessonMedia(teacher, { ...example, visibility: "SHARED" })).toBe(true);
  });
});
