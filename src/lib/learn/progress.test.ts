import { describe, expect, it } from "vitest";
import { computeStreak, xpToday } from "./progress";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const now = d("2026-10-30");

describe("streaks", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak([d("2026-10-28"), d("2026-10-29"), d("2026-10-30"), d("2026-10-30")], now)).toEqual({ days: 3, activeToday: true });
  });
  it("keeps yesterday's streak alive until today ends", () => {
    expect(computeStreak([d("2026-10-28"), d("2026-10-29")], now)).toEqual({ days: 2, activeToday: false });
  });
  it("resets after a missed day", () => {
    expect(computeStreak([d("2026-10-27"), d("2026-10-28")], now)).toEqual({ days: 0, activeToday: false });
  });
  it("sums only today's XP", () => {
    expect(xpToday([{ awardedXp: 30, createdAt: d("2026-10-30") }, { awardedXp: 15, createdAt: d("2026-10-29") }], now)).toBe(30);
  });
});
