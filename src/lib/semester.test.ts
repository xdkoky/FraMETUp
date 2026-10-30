import { describe, expect, it } from "vitest";
import { semesterForDate, semesterLabel, semesterRange } from "./semester";

describe("semester helpers", () => {
  it("maps dates to semesters", () => {
    expect(semesterForDate(2025, new Date(2025, 9, 10))).toBe(1);
    expect(semesterForDate(2025, new Date(2026, 2, 10))).toBe(2);
    expect(semesterForDate(2025, new Date(2026, 9, 10))).toBe(3);
    expect(semesterForDate(2025, new Date(2025, 5, 1))).toBe(1); // before enrollment clamps to 1
  });
  it("round-trips ranges", () => {
    for (let s = 1; s <= 8; s++) {
      const { start } = semesterRange(2024, s);
      expect(semesterForDate(2024, start)).toBe(s);
    }
  });
  it("labels semesters", () => {
    expect(semesterLabel(2025, 2)).toBe("Year 1 · Spring 2026");
  });
});
