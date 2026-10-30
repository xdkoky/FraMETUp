/**
 * FraMETUp — mastery estimation engine.
 *
 * Pure, deterministic, framework-free. Given every piece of evidence about one skill
 * for one student, it returns an estimate, a separate confidence value, and a plain-
 * language explanation of how both were reached.
 *
 * IMPORTANT: the weights and thresholds here are product heuristics for prototyping,
 * NOT a validated measurement instrument. They are configurable and should be
 * calibrated with real students and instructors.
 *
 * Key design rules
 *  - "Not assessed" is a distinct state; absence of evidence is never scored as low.
 *  - Quantity of evidence raises confidence, never the estimate itself (averaging,
 *    not summing), so many easy projects don't outrank fewer demanding ones.
 *  - Missing sources are reweighted, and the explanation says which are absent.
 *  - Repeated reviews from the same person, or of the same project, have
 *    diminishing weight.
 *  - Mastery does not decay with time; staleness is surfaced as "needs reassessment".
 *  - AI suggestions count only once the student has explicitly accepted them.
 */

export const ALGORITHM_VERSION = "mastery-v1.0";

export type SourceKey = "self" | "peer" | "ai" | "project";

export type ProficiencyState =
  | "NOT_ASSESSED"
  | "EMERGING"
  | "DEVELOPING"
  | "PROFICIENT"
  | "ADVANCED"
  | "STRONGLY_EVIDENCED";

export type ObservationValue =
  | "NOT_OBSERVED"
  | "INSUFFICIENT_EVIDENCE"
  | "OBSERVED_WITH_DIFFICULTY"
  | "DEMONSTRATED_WITH_SUPPORT"
  | "DEMONSTRATED_INDEPENDENTLY"
  | "DEMONSTRATED_CONSISTENTLY";

export type FamiliarityValue = "BRIEF" | "WORKED_ALONGSIDE" | "CLOSE_COLLABORATOR";

export interface SelfEvidence {
  id: string;
  level: number; // 1..5
  hasSupport: boolean; // reflection or example attached
  rubricVersion: number;
  createdAt: Date;
}

export interface PeerEvidence {
  id: string; // review item id
  reviewId: string;
  reviewerId: string;
  projectId: string | null;
  observation: ObservationValue;
  familiarity: FamiliarityValue;
  commentLength: number;
  isInstructor?: boolean;
  rubricVersion: number;
  createdAt: Date;
}

export interface ProjectEvidenceInput {
  id: string; // SkillEvidenceLink id
  projectId: string;
  relevance: "PRIMARY" | "SECONDARY" | "INCIDENTAL";
  difficulty: number; // 1..3
  independence: "WITH_GUIDANCE" | "WITH_SUPPORT" | "INDEPENDENT";
  demonstratedLevel: number | null;
  hasArtifacts: boolean;
  createdAt: Date;
}

export interface AIEvidence {
  id: string;
  suggestedLevel: number | null;
  confidence: number; // provider-reported 0..1
  accepted: boolean;
  createdAt: Date;
}

export interface SkillEvidence {
  self: SelfEvidence[];
  peer: PeerEvidence[];
  project: ProjectEvidenceInput[];
  ai: AIEvidence[];
}

export interface EngineConfig {
  weights: Record<SourceKey, number>;
  currentRubricVersion: number;
  /** Months without new evidence before a skill is flagged for reassessment. */
  reassessAfterMonths: number;
  /** Recency half-life (months) used only to rank evidence against other evidence. */
  recencyHalfLifeMonths: number;
  discrepancyThreshold: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  weights: { self: 0.2, peer: 0.45, ai: 0.15, project: 0.2 },
  currentRubricVersion: 1,
  reassessAfterMonths: 12,
  recencyHalfLifeMonths: 18,
  discrepancyThreshold: 25,
};

export interface SourceBreakdown {
  source: SourceKey;
  present: boolean;
  score: number | null;
  baseWeight: number;
  effectiveWeight: number;
  items: number;
  note: string;
}

export interface MasteryResult {
  mastery: number | null;
  confidence: number;
  confidenceBand: "NONE" | "LOW" | "MODERATE" | "GOOD" | "HIGH";
  state: ProficiencyState;
  selfReportedOnly: boolean;
  breakdown: SourceBreakdown[];
  missingSources: SourceKey[];
  discrepancy: { self: number; peer: number; direction: "self-higher" | "self-lower" } | null;
  needsReassessment: boolean;
  practiced: boolean;
  lastEvidenceAt: Date | null;
  distinctContexts: number;
  distinctReviewers: number;
  explanation: string[];
  warnings: string[];
  algorithmVersion: string;
}

export const SOURCE_LABEL: Record<SourceKey, string> = {
  self: "Self-assessment",
  peer: "Peer & instructor feedback",
  ai: "AI-assisted evidence (accepted)",
  project: "Structured project evidence",
};

/** Rubric level 1..5 → internal 0–100 scale (centre of each band). */
export function levelToScore(level: number): number {
  return 10 + (level - 1) * 20;
}

export const OBSERVATION_SCORE: Record<ObservationValue, number | null> = {
  NOT_OBSERVED: null,
  INSUFFICIENT_EVIDENCE: null,
  OBSERVED_WITH_DIFFICULTY: 25,
  DEMONSTRATED_WITH_SUPPORT: 45,
  DEMONSTRATED_INDEPENDENTLY: 70,
  DEMONSTRATED_CONSISTENTLY: 90,
};

const FAMILIARITY_WEIGHT: Record<FamiliarityValue, number> = {
  BRIEF: 0.6,
  WORKED_ALONGSIDE: 1,
  CLOSE_COLLABORATOR: 1.1,
};

const RELEVANCE_WEIGHT = { PRIMARY: 1, SECONDARY: 0.6, INCIDENTAL: 0.3 } as const;
const INDEPENDENCE_WEIGHT = { WITH_GUIDANCE: 0.7, WITH_SUPPORT: 0.85, INDEPENDENT: 1 } as const;

export function stateFor(mastery: number | null, confidence: number): ProficiencyState {
  if (mastery === null) return "NOT_ASSESSED";
  if (mastery >= 70 && confidence >= 0.75) return "STRONGLY_EVIDENCED";
  if (mastery < 30) return "EMERGING";
  if (mastery < 50) return "DEVELOPING";
  if (mastery < 70) return "PROFICIENT";
  return "ADVANCED";
}

export function confidenceBand(confidence: number, assessed: boolean): MasteryResult["confidenceBand"] {
  if (!assessed) return "NONE";
  if (confidence < 0.25) return "LOW";
  if (confidence < 0.55) return "MODERATE";
  if (confidence < 0.8) return "GOOD";
  return "HIGH";
}

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.44;

function monthsBetween(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / MONTH_MS);
}

function recencyWeight(at: Date, now: Date, halfLife: number) {
  // Only used to rank evidence relative to other evidence; floor keeps old
  // demonstrations meaningful (skills are not assumed to deteriorate).
  return Math.max(0.5, Math.pow(0.5, monthsBetween(at, now) / halfLife));
}

function rubricWeight(version: number, current: number) {
  return version === current ? 1 : 0.9;
}

function isValidLevel(level: unknown): level is number {
  return typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 5;
}

function weightedMean(pairs: Array<[number, number]>): number | null {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return null;
  return pairs.reduce((s, [v, w]) => s + v * w, 0) / total;
}

function dedupe<T extends { id: string }>(items: T[], warnings: string[], label: string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      warnings.push(`Duplicate ${label} record ${item.id} ignored.`);
      continue;
    }
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function round(n: number, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Translator for explanation text; English source strings are the keys. */
export type EngineT = (source: string, vars?: Record<string, string | number>) => string;
const plainT: EngineT = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);

export function computeMastery(
  input: SkillEvidence,
  now: Date = new Date(),
  config: EngineConfig = DEFAULT_CONFIG,
  t: EngineT = plainT,
): MasteryResult {
  const pl = (n: number, one: string, many: string, vars: Record<string, string | number> = {}) => t(n === 1 ? one : many, { n, ...vars });
  const warnings: string[] = [];
  const explanation: string[] = [];
  let usedOlderRubric = false;

  // ── Self-assessment: latest valid record supersedes earlier ones ──
  const selfValid = dedupe(input.self, warnings, "self-assessment").filter((s) => {
    if (!isValidLevel(s.level)) {
      warnings.push(`Self-assessment ${s.id} has out-of-range level ${String(s.level)} and was ignored.`);
      return false;
    }
    return true;
  });
  const latestSelf = [...selfValid].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  let selfScore: number | null = null;
  let selfNote = t("No self-assessment yet.");
  if (latestSelf) {
    let level = latestSelf.level;
    if (level >= 4 && !latestSelf.hasSupport) {
      level = 3;
      warnings.push("A self-assessed level of 4+ without a reflection or example is counted as level 3.");
    }
    selfScore = levelToScore(level);
    if (latestSelf.rubricVersion !== config.currentRubricVersion) usedOlderRubric = true;
    selfNote =
      level !== latestSelf.level
        ? t("Latest self-assessment: level {level} (counted as 3 — add supporting evidence).", { level: latestSelf.level })
        : t("Latest self-assessment: level {level}.", { level: latestSelf.level });
  }

  // ── Peer & instructor feedback ──
  const peerValid = dedupe(input.peer, warnings, "peer review item");
  const observed = peerValid.filter((p) => {
    if (!(p.observation in OBSERVATION_SCORE)) {
      warnings.push(`Peer item ${p.id} has an unknown observation value and was ignored.`);
      return false;
    }
    return OBSERVATION_SCORE[p.observation] !== null;
  });
  const notObservedCount = peerValid.length - observed.length;
  // Diminishing weight for repeated reviews from the same reviewer, and for many
  // reviews of the same project (they are not independent demonstrations).
  const byReviewer = new Map<string, number>();
  const byProject = new Map<string, number>();
  const peerPairs: Array<[number, number]> = [];
  for (const p of [...observed].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    const rCount = (byReviewer.get(p.reviewerId) ?? 0) + 1;
    byReviewer.set(p.reviewerId, rCount);
    const projectKey = p.projectId ?? `no-project:${p.reviewId}`;
    const pCount = (byProject.get(projectKey) ?? 0) + 1;
    byProject.set(projectKey, pCount);
    if (p.rubricVersion !== config.currentRubricVersion) usedOlderRubric = true;
    const weight =
      (1 / rCount) *
      (1 / Math.sqrt(pCount)) *
      FAMILIARITY_WEIGHT[p.familiarity] *
      (p.commentLength >= 40 ? 1 : 0.75) *
      (p.isInstructor ? 1.25 : 1) *
      recencyWeight(p.createdAt, now, config.recencyHalfLifeMonths) *
      rubricWeight(p.rubricVersion, config.currentRubricVersion);
    peerPairs.push([OBSERVATION_SCORE[p.observation] as number, weight]);
  }
  const peerScore = weightedMean(peerPairs);
  const distinctReviewers = byReviewer.size;
  const peerNote = observed.length
    ? pl(observed.length, "1 observation", "{n} observations") +
      " " +
      pl(distinctReviewers, "from 1 reviewer", "from {n} reviewers") +
      (notObservedCount ? t("; {n} marked “not observed” (excluded, not scored as low)", { n: notObservedCount }) : "") +
      "."
    : notObservedCount
      ? pl(notObservedCount, "1 reviewer response marked “not observed” — excluded rather than scored as low.", "{n} reviewer responses marked “not observed” — excluded rather than scored as low.")
      : t("No peer feedback yet.");

  // ── Structured project evidence ──
  const projectValid = dedupe(input.project, warnings, "project evidence");
  const projectSeen = new Set<string>();
  const projectPairs: Array<[number, number]> = [];
  let practicedOnly = 0;
  for (const e of projectValid) {
    if (projectSeen.has(e.projectId)) {
      warnings.push(`Project ${e.projectId} linked to this skill more than once; extra link ignored.`);
      continue;
    }
    projectSeen.add(e.projectId);
    if (e.demonstratedLevel === null) {
      practicedOnly++;
      continue;
    }
    if (!isValidLevel(e.demonstratedLevel)) {
      warnings.push(`Project evidence ${e.id} has out-of-range level ${String(e.demonstratedLevel)} and was ignored.`);
      continue;
    }
    const difficulty = Math.min(3, Math.max(1, Math.round(e.difficulty || 2)));
    const weight =
      RELEVANCE_WEIGHT[e.relevance] *
      (0.6 + 0.2 * difficulty) * // demanding work weighs more — it does not score higher by count
      INDEPENDENCE_WEIGHT[e.independence] *
      (e.hasArtifacts ? 1 : 0.7) *
      recencyWeight(e.createdAt, now, config.recencyHalfLifeMonths);
    projectPairs.push([levelToScore(e.demonstratedLevel), weight]);
  }
  const projectScore = weightedMean(projectPairs);
  const projectContexts = projectSeen.size;
  const projectNote = projectPairs.length
    ? pl(projectPairs.length, "1 project mapped to the rubric", "{n} projects mapped to the rubric") +
      (practicedOnly ? t(", {n} more linked as practice only", { n: practicedOnly }) : "") +
      "."
    : practicedOnly
      ? pl(practicedOnly, "1 project linked as practice, but not yet mapped to a rubric level.", "{n} projects linked as practice, but not yet mapped to a rubric level.")
      : t("No project evidence linked yet.");

  // ── AI suggestions (accepted only) ──
  const aiValid = dedupe(input.ai, warnings, "AI suggestion");
  const aiAccepted = aiValid.filter((a) => a.accepted && isValidLevel(a.suggestedLevel));
  const aiPairs: Array<[number, number]> = aiAccepted.map((a) => [
    levelToScore(a.suggestedLevel as number),
    Math.min(1, Math.max(0.05, a.confidence)),
  ]);
  const aiScore = weightedMean(aiPairs);
  const aiPending = aiValid.filter((a) => !a.accepted).length;
  const aiNote = aiAccepted.length
    ? pl(aiAccepted.length, "1 AI suggestion you accepted.", "{n} AI suggestions you accepted.")
    : aiPending
      ? pl(aiPending, "1 AI suggestion awaiting your review — not counted until accepted.", "{n} AI suggestions awaiting your review — not counted until accepted.")
      : t("No accepted AI suggestions.");

  // ── Combine available sources ──
  const scores: Record<SourceKey, number | null> = {
    self: selfScore,
    peer: peerScore,
    ai: aiScore,
    project: projectScore,
  };
  const items: Record<SourceKey, number> = {
    self: latestSelf ? 1 : 0,
    peer: observed.length,
    ai: aiAccepted.length,
    project: projectPairs.length,
  };
  const notes: Record<SourceKey, string> = { self: selfNote, peer: peerNote, ai: aiNote, project: projectNote };
  const sources: SourceKey[] = ["self", "peer", "ai", "project"];
  const present = sources.filter((s) => scores[s] !== null);
  const missing = sources.filter((s) => scores[s] === null);
  const presentWeight = present.reduce((s, k) => s + config.weights[k], 0);

  const breakdown: SourceBreakdown[] = sources.map((s) => ({
    source: s,
    present: scores[s] !== null,
    score: scores[s] === null ? null : round(scores[s] as number),
    baseWeight: config.weights[s],
    effectiveWeight: scores[s] !== null && presentWeight > 0 ? round(config.weights[s] / presentWeight, 3) : 0,
    items: items[s],
    note: notes[s],
  }));

  const allDates = [
    ...selfValid.map((s) => s.createdAt),
    ...peerValid.map((p) => p.createdAt),
    ...projectValid.map((p) => p.createdAt),
    ...aiAccepted.map((a) => a.createdAt),
  ];
  const lastEvidenceAt = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : null;
  const practiced = projectValid.length > 0 || allDates.length > 0;

  if (present.length === 0 || presentWeight <= 0) {
    explanation.push(t("Not yet assessed. There is no rubric-anchored evidence for this skill — this says nothing about your ability."));
    if (practicedOnly) explanation.push(projectNote);
    if (notObservedCount) explanation.push(peerNote);
    return {
      mastery: null,
      confidence: 0,
      confidenceBand: "NONE",
      state: "NOT_ASSESSED",
      selfReportedOnly: false,
      breakdown,
      missingSources: missing,
      discrepancy: null,
      needsReassessment: false,
      practiced,
      lastEvidenceAt,
      distinctContexts: projectContexts,
      distinctReviewers,
      explanation,
      warnings,
      algorithmVersion: ALGORITHM_VERSION,
    };
  }

  const mastery = present.reduce((s, k) => s + (scores[k] as number) * config.weights[k], 0) / presentWeight;

  // ── Confidence: quantity × independence × diversity × agreement ──
  const distinctContexts = new Set([
    ...observed.map((p) => p.projectId).filter(Boolean),
    ...projectValid.filter((p) => p.demonstratedLevel !== null).map((p) => p.projectId),
  ]).size;
  const effectiveEvidence =
    (latestSelf ? 0.5 : 0) +
    distinctReviewers * 1.0 +
    Math.max(0, observed.length - distinctReviewers) * 0.25 +
    distinctContexts * 0.8 +
    Math.min(aiAccepted.length, 2) * 0.3;
  const quantity = 1 - Math.exp(-effectiveEvidence / 3);
  const diversity = 0.6 + 0.4 * ((present.length - 1) / 3);
  const presentScores = present.map((k) => scores[k] as number);
  const meanScore = presentScores.reduce((a, b) => a + b, 0) / presentScores.length;
  const spread = Math.sqrt(presentScores.reduce((s, v) => s + (v - meanScore) ** 2, 0) / presentScores.length);
  const agreement = Math.min(1, Math.max(0.4, 1 - spread / 60));
  let confidence = quantity * diversity * agreement;

  const selfReportedOnly = present.every((k) => k === "self" || k === "project");
  if (selfReportedOnly) confidence = Math.min(confidence, 0.35);
  confidence = round(Math.min(1, Math.max(0, confidence)), 3);

  const discrepancy =
    scores.self !== null && scores.peer !== null && Math.abs(scores.self - scores.peer) >= config.discrepancyThreshold
      ? {
          self: round(scores.self),
          peer: round(scores.peer),
          direction: (scores.self > scores.peer ? "self-higher" : "self-lower") as "self-higher" | "self-lower",
        }
      : null;

  const needsReassessment = lastEvidenceAt !== null && monthsBetween(lastEvidenceAt, now) >= config.reassessAfterMonths;
  const state = stateFor(mastery, confidence);

  // ── Explanation ──
  // Lowercase for mid-sentence use, but keep acronyms such as "AI" / "MI".
  const lowerFirst = (s: string) => (/^\p{Lu}{2}/u.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
  const sourceList = (keys: SourceKey[]) => keys.map((k) => lowerFirst(t(SOURCE_LABEL[k]))).join(", ");
  explanation.push(t("Estimate based on {sources}.", { sources: sourceList(present) }));
  if (missing.length) {
    explanation.push(t("Missing: {sources}. Available sources were reweighted, so treat the estimate with caution.", { sources: sourceList(missing) }));
  }
  for (const k of present) explanation.push(notes[k]);
  if (selfReportedOnly) {
    explanation.push(t("All evidence so far is self-reported, so confidence is capped. Feedback from a collaborator would strengthen it."));
  }
  if (discrepancy) {
    explanation.push(
      discrepancy.direction === "self-higher"
        ? t("Your self-assessment is noticeably higher than peer observations. That's useful information, not a verdict — consider asking reviewers for concrete examples.")
        : t("Peers observed this skill more strongly than you rated yourself. You may be underestimating it."),
    );
  }
  if (agreement < 0.75) explanation.push(t("Sources disagree, which lowers confidence."));
  if (usedOlderRubric) {
    explanation.push(t("Some evidence was assessed against an earlier rubric version; it still counts, with slightly reduced weight."));
  }
  if (needsReassessment) {
    explanation.push(
      t("No new evidence for {n} months. The estimate is kept — skills aren't assumed to fade — but a fresh look would help.", {
        n: Math.floor(monthsBetween(lastEvidenceAt as Date, now)),
      }),
    );
  }

  return {
    mastery: round(mastery),
    confidence,
    confidenceBand: confidenceBand(confidence, true),
    state,
    selfReportedOnly,
    breakdown,
    missingSources: missing,
    discrepancy,
    needsReassessment,
    practiced,
    lastEvidenceAt,
    distinctContexts,
    distinctReviewers,
    explanation,
    warnings,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

export const STATE_LABEL: Record<ProficiencyState, string> = {
  NOT_ASSESSED: "Not yet assessed",
  EMERGING: "Emerging",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  ADVANCED: "Advanced",
  STRONGLY_EVIDENCED: "Strongly evidenced",
};

export const CONFIDENCE_LABEL: Record<MasteryResult["confidenceBand"], string> = {
  NONE: "No evidence",
  LOW: "Low",
  MODERATE: "Moderate",
  GOOD: "Good",
  HIGH: "High",
};

export interface CategoryAggregate {
  categoryId: string;
  /** Confidence-weighted mean over assessed skills only; null when none assessed. */
  mastery: number | null;
  confidence: number;
  assessed: number;
  total: number;
  coverage: number;
}

/** Aggregates per-skill results into a category profile without treating unassessed as zero. */
export function aggregateCategory(
  categoryId: string,
  results: Array<{ mastery: number | null; confidence: number }>,
): CategoryAggregate {
  const assessed = results.filter((r) => r.mastery !== null);
  const pairs: Array<[number, number]> = assessed.map((r) => [r.mastery as number, Math.max(0.1, r.confidence)]);
  const mastery = weightedMean(pairs);
  const confidence = assessed.length ? assessed.reduce((s, r) => s + r.confidence, 0) / assessed.length : 0;
  return {
    categoryId,
    mastery: mastery === null ? null : round(mastery),
    confidence: round(confidence, 3),
    assessed: assessed.length,
    total: results.length,
    coverage: results.length ? round(assessed.length / results.length, 3) : 0,
  };
}
