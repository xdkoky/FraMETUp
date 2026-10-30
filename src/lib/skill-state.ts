import type { ProficiencyState } from "@/lib/assessment/engine";

export const STATE_ORDER: ProficiencyState[] = [
  "NOT_ASSESSED",
  "EMERGING",
  "DEVELOPING",
  "PROFICIENT",
  "ADVANCED",
  "STRONGLY_EVIDENCED",
];

/** Visual language for proficiency states. Unassessed is hollow — never "red" or "weak". */
export const STATE_STYLE: Record<ProficiencyState, { color: string; label: string; short: string; description: string }> = {
  NOT_ASSESSED: {
    color: "#4A5263",
    label: "Not yet assessed",
    short: "Unassessed",
    description: "No rubric-anchored evidence yet. This says nothing about ability.",
  },
  EMERGING: { color: "#8790A3", label: "Emerging", short: "Emerging", description: "Early signs of the skill." },
  DEVELOPING: { color: "#5B7FD6", label: "Developing", short: "Developing", description: "Practised with growing control." },
  PROFICIENT: { color: "#6E9BFF", label: "Proficient", short: "Proficient", description: "Demonstrated reliably in typical situations." },
  ADVANCED: { color: "#B3C8FF", label: "Advanced", short: "Advanced", description: "Demonstrated with nuance and independence." },
  STRONGLY_EVIDENCED: {
    color: "#E8B04B",
    label: "Strongly evidenced",
    short: "Strong evidence",
    description: "High estimate backed by broad, consistent, independent evidence.",
  },
};
