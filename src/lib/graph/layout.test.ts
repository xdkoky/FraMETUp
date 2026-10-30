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
