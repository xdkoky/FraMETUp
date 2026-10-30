import { describe, expect, it } from "vitest";
import { CATEGORIES, SKILLS } from "@/lib/taxonomy";
import { CHALLENGES } from "@/lib/taxonomy/challenges";
import { CATEGORIES_HU, CHALLENGES_HU, EVIDENCE_HU, SKILLS_HU } from "./index";

describe("Hungarian taxonomy", () => {
  it("translates every skill with the same structure", () => {
    for (const s of SKILLS) {
      const hu = SKILLS_HU[s.id];
      expect(hu, s.id).toBeDefined();
      expect(hu.levels).toHaveLength(5);
      expect(new Set(hu.levels).size).toBe(5);
      expect(hu.outcomes.length, s.id).toBe(s.outcomes.length);
      expect(hu.criteria.length, s.id).toBe(s.criteria.length);
      expect(hu.exercises.length, s.id).toBe(s.exercises.length);
    }
    expect(Object.keys(SKILLS_HU).sort()).toEqual(SKILLS.map((s) => s.id).sort());
  });

  it("translates every category, evidence type and challenge", () => {
    for (const c of CATEGORIES) expect(CATEGORIES_HU[c.id]).toBeDefined();
    for (const s of SKILLS) for (const e of s.evidenceTypes) expect(EVIDENCE_HU[e], e).toBeDefined();
    for (const c of CHALLENGES) {
      const hu = CHALLENGES_HU[c.id];
      expect(hu, c.id).toBeDefined();
      expect(hu.instructions.length).toBe(c.instructions.length);
      expect(hu.resources.length).toBe(c.resources.length);
    }
  });
});
