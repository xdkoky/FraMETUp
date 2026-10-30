import { describe, expect, it } from "vitest";
import { EvidenceSchema, LinkSkillSchema, ProjectSchema, SelfAssessmentSchema } from "./project";

describe("validation", () => {
  it("parses a project with objectives split by line", () => {
    const r = ProjectSchema.parse({ title: "Night Shift", type: "SHORT_FILM", description: "An eight-minute short.", objectives: "One\n\nTwo\n" });
    expect(r.objectives).toEqual(["One", "Two"]);
    expect(r.visibility).toBe("PRIVATE");
  });
  it("rejects end before start", () => {
    expect(ProjectSchema.safeParse({ title: "x y", type: "SHORT_FILM", description: "long enough text", startDate: "2026-02-01", endDate: "2026-01-01" }).success).toBe(false);
  });
  it("requires justification for high demonstrated levels", () => {
    const base = { skillId: "visual.blocking", relevance: "PRIMARY", difficulty: "2", independence: "INDEPENDENT" };
    expect(LinkSkillSchema.safeParse({ ...base, demonstratedLevel: "4" }).success).toBe(false);
    expect(LinkSkillSchema.safeParse({ ...base, demonstratedLevel: "2" }).success).toBe(true);
    expect(LinkSkillSchema.safeParse({ ...base, demonstratedLevel: "" }).data?.demonstratedLevel).toBeNull();
  });
  it("only accepts https evidence links", () => {
    expect(EvidenceSchema.safeParse({ kind: "VIDEO_LINK", title: "Cut", url: "javascript:alert(1)" }).success).toBe(false);
    expect(EvidenceSchema.safeParse({ kind: "VIDEO_LINK", title: "Cut", url: "http://x.com" }).success).toBe(false);
    expect(EvidenceSchema.safeParse({ kind: "VIDEO_LINK", title: "Cut", url: "https://vimeo.com/1" }).success).toBe(true);
  });
  it("requires support for self-assessed level 4+", () => {
    expect(SelfAssessmentSchema.safeParse({ skillId: "visual.blocking", level: "5" }).success).toBe(false);
    expect(SelfAssessmentSchema.safeParse({ skillId: "visual.blocking", level: "5", exampleProjectId: "p1" }).success).toBe(true);
    expect(SelfAssessmentSchema.safeParse({ skillId: "visual.blocking", level: "9" }).success).toBe(false);
  });
});
