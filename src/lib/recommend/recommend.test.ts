import { describe, expect, it } from "vitest";
import { recommendChallenges, type RecChallenge, type RecContext } from "./recommend";

const NOW = new Date("2026-10-01");
const challenges: RecChallenge[] = [
  { id: "blocking", title: "Blocking", difficulty: 2, durationMinutes: 120, skills: ["visual.blocking"] },
  { id: "pitch", title: "Pitch", difficulty: 1, durationMinutes: 60, skills: ["professional.pitching"] },
  { id: "epic", title: "Epic", difficulty: 3, durationMinutes: 600, skills: ["visual.movement-motivation"] },
];
const base: RecContext = {
  skills: {
    "visual.blocking": { mastery: null, confidence: 0, lastPracticedAt: null, categoryId: "visual" },
    "professional.pitching": { mastery: 60, confidence: 0.6, lastPracticedAt: null, categoryId: "professional" },
    "visual.movement-motivation": { mastery: null, confidence: 0, lastPracticedAt: null, categoryId: "visual" },
  },
  prerequisites: { "visual.movement-motivation": ["visual.blocking"] },
  goalSkillIds: [],
  interestCategoryIds: [],
  availableMinutes: null,
  excluded: [],
  now: NOW,
};

describe("recommendChallenges", () => {
  it("prioritises learning goals", () => {
    const r = recommendChallenges(challenges, { ...base, goalSkillIds: ["professional.pitching"] });
    expect(r[0].challengeId).toBe("pitch");
    expect(r[0].reasons.join(" ")).toMatch(/learning goals/);
  });

  it("excludes completed or dismissed challenges", () => {
    const r = recommendChallenges(challenges, { ...base, excluded: ["blocking"] });
    expect(r.map((x) => x.challengeId)).not.toContain("blocking");
  });

  it("penalises challenges longer than available time", () => {
    const r = recommendChallenges(challenges, { ...base, availableMinutes: 90 }, 3);
    expect(r[r.length - 1].challengeId).toBe("epic");
  });

  it("explains every recommendation", () => {
    for (const r of recommendChallenges(challenges, base)) expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("never removes a challenge purely for missing prerequisites", () => {
    const r = recommendChallenges(challenges, base, 10);
    expect(r.map((x) => x.challengeId)).toContain("epic");
  });
});
