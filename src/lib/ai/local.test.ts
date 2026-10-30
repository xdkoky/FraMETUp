import { describe, expect, it } from "vitest";
import { LocalHeuristicProvider } from "./local";
import { sanitizeAnalysis } from "./types";

const catalog = [
  { id: "visual.blocking", name: "Blocking", category: "Visual", description: "" },
  { id: "story.pacing", name: "Pacing", category: "Story", description: "" },
  { id: "actor.trust", name: "Building actor trust", category: "Actors", description: "" },
];

describe("LocalHeuristicProvider", () => {
  it("suggests skills by keyword without estimating levels", async () => {
    const r = await new LocalHeuristicProvider().analyzeReflection({
      reflectionText: "We rehearsed the blocking on a floor plan. The middle section dragged and the pacing felt slow.",
      linkedSkillIds: ["actor.trust"],
      catalog,
    });
    expect(r.suggestions.map((s) => s.skillId).sort()).toEqual(["story.pacing", "visual.blocking"]);
    expect(r.suggestions.every((s) => s.suggestedLevel === null)).toBe(true);
    expect(r.missingEvidence[0]).toMatch(/Building actor trust/);
    expect(r.summary).toMatch(/No AI model was used/);
  });
});

describe("sanitizeAnalysis", () => {
  it("drops unknown and duplicate skills and rejects invalid shapes", () => {
    const out = sanitizeAnalysis(
      {
        summary: "s",
        suggestions: [
          { skillId: "visual.blocking", rationale: "r", evidenceQuote: null, suggestedLevel: 3, confidence: 0.5 },
          { skillId: "visual.blocking", rationale: "r", evidenceQuote: null, suggestedLevel: 3, confidence: 0.5 },
          { skillId: "made.up", rationale: "r", evidenceQuote: null, suggestedLevel: 3, confidence: 0.5 },
        ],
        missingEvidence: [],
        questions: [],
        exercises: [],
      },
      new Set(["visual.blocking"]),
    );
    expect(out.suggestions).toHaveLength(1);
    expect(() => sanitizeAnalysis({ summary: 1 }, new Set())).toThrow();
    expect(() =>
      sanitizeAnalysis(
        { summary: "", suggestions: [{ skillId: "visual.blocking", rationale: "", evidenceQuote: null, suggestedLevel: 9, confidence: 0.5 }], missingEvidence: [], questions: [], exercises: [] },
        new Set(["visual.blocking"]),
      ),
    ).toThrow();
  });
});
