import { describe, expect, it } from "vitest";
import { SKILLS } from "@/lib/taxonomy";
import { ALL_LESSONS, ALL_MODULES, GUIDES, LESSON_BY_ID, REFERENCES, TRACKS } from "./index";

const skillIds = new Set(SKILLS.map((s) => s.id));
const filled = (s: { en: string; hu: string }) => s.en.trim().length > 0 && s.hu.trim().length > 0;

describe("learning tracks", () => {
  it("has unique lesson ids prefixed by their module", () => {
    expect(new Set(ALL_LESSONS.map((l) => l.id)).size).toBe(ALL_LESSONS.length);
    for (const m of ALL_MODULES) for (const l of m.lessons) expect(l.id.startsWith(`${m.id}.`), l.id).toBe(true);
    expect(Object.keys(LESSON_BY_ID)).toHaveLength(ALL_LESSONS.length);
  });

  it("has complete bilingual content and a valid check in every lesson", () => {
    for (const m of ALL_MODULES) expect(filled(m.title) && filled(m.blurb), m.id).toBe(true);
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

  it("has both tracks with unique module ids", () => {
    expect(TRACKS.map((t) => t.id)).toEqual(["directing", "cinematography"]);
    for (const t of TRACKS) expect(t.modules.length, t.id).toBeGreaterThanOrEqual(8);
    expect(new Set(ALL_MODULES.map((m) => m.id)).size).toBe(ALL_MODULES.length);
  });

  it("only lists guides for real units, with sources and https links", () => {
    const ids = new Set(ALL_MODULES.map((m) => m.id));
    for (const [unit, list] of Object.entries(GUIDES)) {
      expect(ids.has(unit), unit).toBe(true);
      for (const g of list) {
        expect(g.title && g.source, g.title).toBeTruthy();
        expect(filled(g.note), g.title).toBe(true);
        if (g.kind !== "book") expect(g.url, g.title).toMatch(/^https:\/\//);
        if (g.youtube) expect(g.youtube, g.title).toMatch(/^[\w-]{11}$/);
      }
    }
  });

  it("credits every reference picture", () => {
    for (const [lesson, list] of Object.entries(REFERENCES)) {
      expect(LESSON_BY_ID[lesson], lesson).toBeDefined();
      for (const r of list) {
        expect(r.credit && r.license, r.src).toBeTruthy();
        expect(r.sourceUrl, r.src).toMatch(/^https:\/\//);
        expect(filled(r.alt) && filled(r.caption), r.src).toBe(true);
      }
    }
  });
});
