import { describe, expect, it } from "vitest";
import { CATEGORIES, DEPENDENCIES, SKILLS } from "./index";

describe("skill taxonomy", () => {
  it("covers all eight categories", () => {
    expect(CATEGORIES).toHaveLength(8);
    for (const c of CATEGORIES) {
      expect(SKILLS.some((s) => s.categoryId === c.id)).toBe(true);
    }
  });

  it("has the expected number of subskills", () => {
    expect(SKILLS).toHaveLength(15 + 14 + 15 + 14 + 14 + 12 + 11 + 10);
  });

  it("has unique ids and unique names within a category", () => {
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length);
    for (const c of CATEGORIES) {
      const names = SKILLS.filter((s) => s.categoryId === c.id).map((s) => s.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("gives every skill a description, outcomes, criteria and five rubric levels", () => {
    for (const s of SKILLS) {
      expect(s.description.length).toBeGreaterThan(20);
      expect(s.outcomes.length).toBeGreaterThan(0);
      expect(s.criteria.length).toBeGreaterThan(0);
      expect(s.levels).toHaveLength(5);
      expect(new Set(s.levels).size).toBe(5);
      expect(s.evidenceTypes.length).toBeGreaterThan(0);
    }
  });

  it("references only existing skills in dependencies", () => {
    const ids = new Set(SKILLS.map((s) => s.id));
    for (const d of DEPENDENCIES) {
      expect(ids.has(d.from), `${d.from} → ${d.to}`).toBe(true);
      expect(ids.has(d.to), `${d.from} → ${d.to}`).toBe(true);
      expect(d.from).not.toBe(d.to);
    }
  });

  it("has an acyclic prerequisite graph", () => {
    const prereqs = new Map<string, string[]>();
    for (const d of DEPENDENCIES.filter((d) => d.kind === "PREREQUISITE")) {
      prereqs.set(d.to, [...(prereqs.get(d.to) ?? []), d.from]);
    }
    const state = new Map<string, "visiting" | "done">();
    const visit = (id: string, path: string[]) => {
      if (state.get(id) === "done") return;
      if (state.get(id) === "visiting") throw new Error(`cycle: ${[...path, id].join(" → ")}`);
      state.set(id, "visiting");
      for (const p of prereqs.get(id) ?? []) visit(p, [...path, id]);
      state.set(id, "done");
    };
    for (const s of SKILLS) visit(s.id, []);
  });

  it("includes cross-category dependencies", () => {
    const cat = new Map(SKILLS.map((s) => [s.id, s.categoryId]));
    const cross = DEPENDENCIES.filter((d) => cat.get(d.from) !== cat.get(d.to));
    expect(cross.length).toBeGreaterThan(20);
  });
});
