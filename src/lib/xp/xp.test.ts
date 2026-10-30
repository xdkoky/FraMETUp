import { describe, expect, it } from "vitest";
import { calculateXp, DAILY_CAP, practiceTier, reflectionQuality } from "./xp";

const NOW = new Date("2026-10-01T15:00:00");

describe("calculateXp", () => {
  it("awards base XP for a first event", () => {
    expect(calculateXp("PROJECT_COMPLETED", [], NOW).awardedXp).toBe(100);
  });

  it("applies diminishing returns for repeated events of the same kind", () => {
    const prior = [1, 2].map((d) => ({ kind: "REFLECTION", awardedXp: 40, createdAt: new Date(NOW.getTime() - d * 86400000) }));
    const r = calculateXp("REFLECTION", prior, NOW);
    expect(r.awardedXp).toBe(20);
    expect(r.reason).toMatch(/diminishing/);
  });

  it("enforces a daily cap", () => {
    const prior = [{ kind: "PROJECT_COMPLETED", awardedXp: DAILY_CAP - 10, createdAt: new Date(NOW.getTime() - 3600000) }];
    expect(calculateXp("CHALLENGE_COMPLETED", prior, NOW).awardedXp).toBe(10);
  });

  it("scales by quality", () => {
    expect(calculateXp("REFLECTION", [], NOW, 0.5).awardedXp).toBe(20);
  });
});

describe("reflectionQuality", () => {
  it("gives nothing for trivial text", () => {
    expect(reflectionQuality("ok", 1)).toBe(0);
  });
  it("rewards depth and answered prompts", () => {
    const long = "a".repeat(1000);
    expect(reflectionQuality(long, 5)).toBeCloseTo(1, 1);
    expect(reflectionQuality(long, 1)).toBeLessThan(reflectionQuality(long, 5));
  });
});

describe("practiceTier", () => {
  it("maps XP to tiers", () => {
    expect(practiceTier(0).name).toBe("Slate");
    expect(practiceTier(600).name).toBe("First Take");
    expect(practiceTier(100000).next).toBeNull();
  });
});
