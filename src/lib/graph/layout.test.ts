import { describe, expect, it } from "vitest";
import { CATEGORIES, DEPENDENCIES, SKILLS } from "@/lib/taxonomy";
import { computeDepths, computeRadialLayout } from "./layout";

describe("radial layout", () => {
  const layout = computeRadialLayout(CATEGORIES, SKILLS, DEPENDENCIES);

  it("positions every skill and category", () => {
    expect(Object.keys(layout.skills)).toHaveLength(SKILLS.length);
    expect(Object.keys(layout.categories)).toHaveLength(CATEGORIES.length);
  });

  it("does not overlap nodes", () => {
    const pts = Object.values(layout.skills);
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        expect(d).toBeGreaterThan(90);
      }
    }
  });

  it("places prerequisites no further out than dependants within a category", () => {
    const depths = computeDepths(SKILLS, DEPENDENCIES);
    expect(depths["visual.composition"]).toBe(0);
    expect(depths["visual.blocking"]).toBeGreaterThan(depths["visual.composition"]);
  });

  it("is deterministic", () => {
    expect(computeRadialLayout(CATEGORIES, SKILLS, DEPENDENCIES)).toEqual(layout);
  });
});

describe("branch layout", () => {
  it("places every skill of a category, prerequisites in earlier columns, without overlaps", async () => {
    const { computeBranchLayout } = await import("./layout");
    for (const c of CATEGORIES) {
      const skills = SKILLS.filter((s) => s.categoryId === c.id);
      const l = computeBranchLayout(skills, DEPENDENCIES);
      expect(Object.keys(l.nodes)).toHaveLength(skills.length);
      for (const d of DEPENDENCIES) {
        if (d.kind === "PREREQUISITE" && l.nodes[d.from] && l.nodes[d.to]) expect(l.nodes[d.from].column).toBeLessThan(l.nodes[d.to].column);
      }
      const pts = Object.values(l.nodes);
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) expect(pts[i].x !== pts[j].x || Math.abs(pts[i].y - pts[j].y) >= 100).toBe(true);
    }
  });
});
