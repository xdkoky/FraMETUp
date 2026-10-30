import { describe, expect, it } from "vitest";
import { SKILLS } from "@/lib/taxonomy";
import { QUIZ, scoreQuiz } from "./questions";

const ids = new Set(SKILLS.map((s) => s.id));

describe("starting-point quiz", () => {
  it("only references real skills", () => {
    for (const q of QUIZ) {
      for (const s of q.skills) expect(ids.has(s), s).toBe(true);
      if (q.kind === "multi") for (const o of q.options) for (const s of o.skills) expect(ids.has(s), s).toBe(true);
    }
  });

  it("gives nothing for no answers", () => {
    expect(scoreQuiz({})).toEqual({});
  });

  it("sets experience-only skills to level 2", () => {
    const r = scoreQuiz({ experience: ["edited", "pitched"] });
    expect(r["technical.editing-fundamentals"]).toBe(2);
    expect(r["professional.pitching"]).toBe(2);
    expect(r["visual.composition"]).toBeUndefined();
  });

  it("scores choices by the option's level", () => {
    expect(scoreQuiz({ isolation: "space" })["visual.composition"]).toBe(3);
    expect(scoreQuiz({ isolation: "crowd" })["visual.composition"]).toBe(1);
  });

  it("scores order and match questions by how much is right", () => {
    expect(scoreQuiz({ beats: ["b1", "b2", "b3", "b4"] })["story.structure"]).toBe(3);
    expect(scoreQuiz({ beats: ["b1", "b2", "b4", "b3"] })["story.structure"]).toBe(2);
    expect(scoreQuiz({ beats: ["b4", "b3", "b2", "b1"] })["story.structure"]).toBe(1);
    expect(scoreQuiz({ techniques: ["long-take:long-take", "jump-cut:jump-cut", "ecu:ecu"] })["analysis.film-language"]).toBe(3);
    expect(scoreQuiz({ techniques: ["long-take:jump-cut", "jump-cut:long-take", "ecu:ecu"] })["analysis.film-language"]).toBe(2);
  });

  it("never exceeds level 3 and averages overlapping signals", () => {
    const r = scoreQuiz({ experience: ["directed-actors"], note: "keep-him" });
    expect(r["actor.communication"]).toBe(3); // mean of 2 and 3 rounds to 3
    expect(Math.max(...Object.values(scoreQuiz({ isolation: "space", note: "keep-him", clock: "prioritise" })))).toBeLessThanOrEqual(3);
  });

  it("ignores unknown option ids", () => {
    expect(scoreQuiz({ isolation: "nope" })).toEqual({});
  });
});
