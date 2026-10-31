import { describe, expect, it } from "vitest";
import { SKILLS } from "@/lib/taxonomy";
import { ALL_LESSONS, COURSE, LESSON_BY_ID } from "./index";

const skillIds = new Set(SKILLS.map((s) => s.id));
const filled = (s: { en: string; hu: string }) => s.en.trim().length > 0 && s.hu.trim().length > 0;

describe("cinematography track", () => {
  it("has unique lesson ids prefixed by their module", () => {
    expect(new Set(ALL_LESSONS.map((l) => l.id)).size).toBe(ALL_LESSONS.length);
    for (const m of COURSE) for (const l of m.lessons) expect(l.id.startsWith(`${m.id}.`), l.id).toBe(true);
    expect(Object.keys(LESSON_BY_ID)).toHaveLength(ALL_LESSONS.length);
  });

  it("has complete bilingual content and a valid check in every lesson", () => {
    for (const m of COURSE) expect(filled(m.title) && filled(m.blurb), m.id).toBe(true);
    for (const l of ALL_LESSONS) {
      expect([l.title, l.summary, l.drill, l.check.q, l.check.why, ...l.points, ...l.check.options].every(filled), l.id).toBe(true);
      expect(l.points.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.check.options.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.check.answer, l.id).toBeLessThan(l.check.options.length);
    }
  });

  it("links every lesson to real skills", () => {
    for (const l of ALL_LESSONS) {
      expect(l.skills.length, l.id).toBeGreaterThan(0);
      for (const s of l.skills) expect(skillIds.has(s), `${l.id} → ${s}`).toBe(true);
    }
  });
});
