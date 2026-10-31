/**
 * Experience points record documented learning *activity*. They never feed into
 * mastery. Diminishing returns and a daily cap discourage low-value repetition.
 */

export type XpKind =
  | "PROJECT_CREATED"
  | "PROJECT_COMPLETED"
  | "REFLECTION"
  | "SELF_ASSESSMENT"
  | "EVIDENCE_ADDED"
  | "FEEDBACK_RECEIVED"
  | "REVIEW_GIVEN"
  | "CHALLENGE_COMPLETED"
  | "PROJECT_REVISITED"
  | "DRILL_PRACTISED"
  | "LESSON_COMPLETED";

export const XP_BASE: Record<XpKind, number> = {
  PROJECT_CREATED: 10,
  PROJECT_COMPLETED: 100,
  REFLECTION: 40,
  SELF_ASSESSMENT: 10,
  EVIDENCE_ADDED: 5,
  FEEDBACK_RECEIVED: 15,
  REVIEW_GIVEN: 25,
  CHALLENGE_COMPLETED: 60,
  PROJECT_REVISITED: 20,
  DRILL_PRACTISED: 15,
  LESSON_COMPLETED: 30,
};

export const XP_LABEL: Record<XpKind, string> = {
  PROJECT_CREATED: "Started a project",
  PROJECT_COMPLETED: "Completed a project",
  REFLECTION: "Wrote a reflection",
  SELF_ASSESSMENT: "Self-assessed a skill",
  EVIDENCE_ADDED: "Added evidence",
  FEEDBACK_RECEIVED: "Received feedback",
  REVIEW_GIVEN: "Reviewed a peer's work",
  CHALLENGE_COMPLETED: "Completed a challenge",
  PROJECT_REVISITED: "Revisited an earlier project",
  DRILL_PRACTISED: "Practised a drill",
  LESSON_COMPLETED: "Completed a lesson",
};

/** Kinds that can only happen once per item (each lesson is finished once), so repetition can't be farmed. */
const NO_DIMINISHING: ReadonlySet<XpKind> = new Set(["LESSON_COMPLETED"]);

export const DAILY_CAP = 250;
const WINDOW_DAYS = 7;

export interface PriorEvent {
  kind: string;
  awardedXp: number;
  createdAt: Date;
}

export interface XpAward {
  baseXp: number;
  awardedXp: number;
  reason: string;
}

/**
 * Calculates the XP for a new event given the user's recent history.
 * @param quality optional 0..1 multiplier (e.g. reflection depth)
 */
export function calculateXp(kind: XpKind, prior: PriorEvent[], now: Date, quality = 1): XpAward {
  const base = XP_BASE[kind];
  const windowStart = now.getTime() - WINDOW_DAYS * 86400000;
  const sameKindRecent = prior.filter((e) => e.kind === kind && e.createdAt.getTime() >= windowStart).length;
  const diminishing = NO_DIMINISHING.has(kind) ? 1 : 1 / (1 + 0.5 * sameKindRecent);
  const q = Math.min(1, Math.max(0, quality));

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const today = prior
    .filter((e) => e.createdAt.getTime() >= dayStart.getTime())
    .reduce((s, e) => s + e.awardedXp, 0);
  const remaining = Math.max(0, DAILY_CAP - today);

  const raw = Math.round(base * diminishing * q);
  const awarded = Math.min(raw, remaining);

  const parts = [XP_LABEL[kind]];
  if (sameKindRecent > 0 && !NO_DIMINISHING.has(kind)) parts.push(`diminishing returns (${sameKindRecent} similar this week)`);
  if (q < 1) parts.push(`depth factor ${Math.round(q * 100)}%`);
  if (awarded < raw) parts.push("daily cap reached");
  return { baseXp: base, awardedXp: awarded, reason: parts.join(" · ") };
}

/** Reflection depth heuristic: rewards substance, not padding. 150 chars → 0.3, 900+ → 1. */
export function reflectionQuality(text: string, answeredPrompts: number): number {
  const len = text.trim().length;
  if (len < 80) return 0;
  const lengthFactor = Math.min(1, 0.3 + (len - 150) / 1070);
  const promptFactor = Math.min(1, answeredPrompts / 4);
  return Math.max(0.2, 0.6 * lengthFactor + 0.4 * promptFactor);
}

/** Practice tiers describe accumulated activity — explicitly not ability. */
export const PRACTICE_TIERS = [
  { min: 0, name: "Slate" },
  { min: 150, name: "Rehearsal" },
  { min: 500, name: "First Take" },
  { min: 1200, name: "Rough Cut" },
  { min: 2500, name: "Fine Cut" },
  { min: 4500, name: "Picture Lock" },
  { min: 7500, name: "Premiere" },
];

export function practiceTier(totalXp: number) {
  let idx = 0;
  PRACTICE_TIERS.forEach((t, i) => {
    if (totalXp >= t.min) idx = i;
  });
  const current = PRACTICE_TIERS[idx];
  const next = PRACTICE_TIERS[idx + 1] ?? null;
  const progress = next ? (totalXp - current.min) / (next.min - current.min) : 1;
  return { ...current, index: idx, next, progress };
}
