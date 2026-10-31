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
    color: "#A3ABB9",
    label: "Not yet assessed",
    short: "Unassessed",
    description: "No rubric-anchored evidence yet. This says nothing about ability.",
  },
  EMERGING: { color: "#8E9BB3", label: "Emerging", short: "Emerging", description: "Early signs of the skill." },
  DEVELOPING: { color: "#5A9CF8", label: "Developing", short: "Developing", description: "Practised with growing control." },
  PROFICIENT: { color: "#2F7CF6", label: "Proficient", short: "Proficient", description: "Demonstrated reliably in typical situations." },
  ADVANCED: { color: "#7B5CF0", label: "Advanced", short: "Advanced", description: "Demonstrated with nuance and independence." },
  STRONGLY_EVIDENCED: {
    color: "#F5A300",
    label: "Strongly evidenced",
    short: "Strong evidence",
    description: "High estimate backed by broad, consistent, independent evidence.",
  },
};
