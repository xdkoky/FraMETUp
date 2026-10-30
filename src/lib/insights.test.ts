import { describe, expect, it } from "vitest";
import { generateInsights } from "./insights";

const cat = (id: string, mastery: number | null, assessed: number, total = 10) => ({ id, name: id, mastery, assessed, total });

describe("generateInsights", () => {
  it("describes evidence, not the person", () => {
    const out = generateInsights([cat("Visual", 70, 3), cat("Actors", 40, 2)], []);
    expect(out[0]).toMatch(/documented work currently shows stronger evidence in visual than in actors/);
    expect(out.join(" ")).not.toMatch(/you are|bad|weak director/i);
  });
  it("names missing categories as documentation gaps", () => {
    const out = generateInsights([cat("Visual", 60, 2), cat("Story", null, 0)], []);
    expect(out.join(" ")).toMatch(/not a judgement of ability/);
  });
  it("summarises self/peer calibration", () => {
    expect(generateInsights([], [{ selfMinusPeer: 30 }, { selfMinusPeer: 20 }]).join(" ")).toMatch(/sit above/);
  });
});
