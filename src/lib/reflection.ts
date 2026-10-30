/** Post-project reflection prompts. Keys are stable; labels may evolve. */
export const REFLECTION_PROMPTS = [
  { key: "intention", label: "What were you trying to achieve?" },
  { key: "worked", label: "What worked?" },
  { key: "didnt", label: "What did not work?" },
  { key: "difficult", label: "Which decisions were most difficult?" },
  { key: "learned", label: "What did you learn about directing?" },
  { key: "feedback", label: "What feedback changed your perspective?" },
  { key: "differently", label: "What would you do differently?" },
  { key: "next", label: "What would you like to improve next?" },
] as const;
