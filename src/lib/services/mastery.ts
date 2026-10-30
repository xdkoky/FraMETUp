// Deliberately not "server-only": the seed script reuses these functions.
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ALGORITHM_VERSION,
  computeMastery,
  DEFAULT_CONFIG,
  type EngineT,
  type MasteryResult,
  type SkillEvidence,
} from "@/lib/assessment/engine";
import { TAXONOMY_VERSION } from "@/lib/taxonomy";

/** Loads every piece of assessment evidence for a user, grouped by skill. */
export async function loadEvidence(userId: string, asOf?: Date): Promise<Map<string, SkillEvidence>> {
  const before = asOf ? { lte: asOf } : undefined;
  const [selfs, peerItems, links, aiSuggestions, instructor] = await Promise.all([
    db.selfAssessment.findMany({
      where: { userId, createdAt: before },
      include: { rubric: { select: { version: true } } },
    }),
    db.peerReviewItem.findMany({
      where: { review: { subjectId: userId, submittedAt: before } },
      include: { review: true, rubric: { select: { version: true } } },
    }),
    db.skillEvidenceLink.findMany({
      where: { project: { ownerId: userId, deletedAt: null }, createdAt: before },
      include: { project: { select: { evidence: { where: { deletedAt: null }, select: { id: true } } } } },
    }),
    db.aISkillSuggestion.findMany({
      where: { aiAssessment: { userId }, decidedAt: before },
      include: { aiAssessment: { select: { createdAt: true } } },
    }),
    db.instructorAssessment.findMany({
      where: { studentId: userId, createdAt: before },
      include: { rubric: { select: { version: true } } },
    }),
  ]);

  const map = new Map<string, SkillEvidence>();
  const get = (skillId: string) => {
    let e = map.get(skillId);
    if (!e) {
      e = { self: [], peer: [], project: [], ai: [] };
      map.set(skillId, e);
    }
    return e;
  };

  for (const s of selfs) {
    get(s.skillId).self.push({
      id: s.id,
      level: s.level,
      hasSupport: Boolean((s.reflection && s.reflection.trim().length >= 40) || s.exampleProjectId),
      rubricVersion: s.rubric.version,
      createdAt: s.createdAt,
    });
  }
  for (const p of peerItems) {
    get(p.skillId).peer.push({
      id: p.id,
      reviewId: p.reviewId,
      reviewerId: p.review.reviewerId,
      projectId: p.review.projectId,
      observation: p.observation,
      familiarity: p.review.familiarity,
      commentLength: (p.comment?.length ?? 0) + (p.example?.length ?? 0),
      rubricVersion: p.rubric.version,
      createdAt: p.review.submittedAt,
    });
  }
  // Instructor feedback is folded into the peer channel with a modest extra weight —
  // one perspective among several, never an override.
  const levelToObservation = ["OBSERVED_WITH_DIFFICULTY", "DEMONSTRATED_WITH_SUPPORT", "DEMONSTRATED_WITH_SUPPORT", "DEMONSTRATED_INDEPENDENTLY", "DEMONSTRATED_CONSISTENTLY"] as const;
  for (const i of instructor) {
    get(i.skillId).peer.push({
      id: `instr-${i.id}`,
      reviewId: `instr-${i.id}`,
      reviewerId: i.instructorId,
      projectId: i.projectId,
      observation: levelToObservation[Math.min(4, Math.max(0, i.level - 1))],
      familiarity: "WORKED_ALONGSIDE",
      commentLength: i.comment.length,
      isInstructor: true,
      rubricVersion: i.rubric.version,
      createdAt: i.createdAt,
    });
  }
  for (const l of links) {
    get(l.skillId).project.push({
      id: l.id,
      projectId: l.projectId,
      relevance: l.relevance,
      difficulty: l.difficulty,
      independence: l.independence,
      demonstratedLevel: l.demonstratedLevel,
      hasArtifacts: l.project.evidence.length > 0,
      createdAt: l.createdAt,
    });
  }
  for (const a of aiSuggestions) {
    if (a.status === "SUGGESTED" && asOf) continue;
    get(a.skillId).ai.push({
      id: a.id,
      suggestedLevel: a.suggestedLevel,
      confidence: a.confidence,
      accepted: a.status === "ACCEPTED",
      createdAt: a.decidedAt ?? a.aiAssessment.createdAt,
    });
  }
  return map;
}

export type MasteryMap = Record<string, MasteryResult>;

/** Computes live results for every skill (unassessed included) without persisting. */
export async function computeAll(userId: string, asOf?: Date, t?: EngineT): Promise<MasteryMap> {
  const [skills, evidence] = await Promise.all([
    db.skill.findMany({ select: { id: true } }),
    loadEvidence(userId, asOf),
  ]);
  const now = asOf ?? new Date();
  const out: MasteryMap = {};
  for (const s of skills) {
    out[s.id] = computeMastery(evidence.get(s.id) ?? { self: [], peer: [], project: [], ai: [] }, now, DEFAULT_CONFIG, t);
  }
  return out;
}

/**
 * Recomputes mastery for the given skills (or all) and appends a snapshot wherever
 * the result changed. Snapshots are the history behind the timeline.
 */
export async function recomputeMastery(userId: string, skillIds?: string[], at?: Date) {
  const all = await computeAll(userId, at);
  const targets = skillIds ?? Object.keys(all);
  const latest = await db.masterySnapshot.findMany({
    where: { userId, skillId: { in: targets }, ...(at ? { computedAt: { lte: at } } : {}) },
    orderBy: { computedAt: "desc" },
    distinct: ["skillId"],
  });
  const latestBySkill = new Map(latest.map((s) => [s.skillId, s]));
  const writes: Prisma.MasterySnapshotCreateManyInput[] = [];
  for (const skillId of targets) {
    const r = all[skillId];
    if (!r) continue;
    const prev = latestBySkill.get(skillId);
    const changed =
      !prev ? r.mastery !== null : prev.mastery !== r.mastery || Math.abs(prev.confidence - r.confidence) > 0.001 || prev.state !== r.state;
    if (!changed) continue;
    writes.push({
      userId,
      skillId,
      mastery: r.mastery,
      confidence: r.confidence,
      state: r.state,
      breakdown: r.breakdown as unknown as Prisma.InputJsonValue,
      explanation: r.explanation,
      algorithmVersion: ALGORITHM_VERSION,
      taxonomyVersion: TAXONOMY_VERSION,
      ...(at ? { computedAt: at } : {}),
    });
  }
  if (writes.length) await db.masterySnapshot.createMany({ data: writes });
  return { all, changed: writes.map((w) => w.skillId) };
}

/** Latest stored snapshot per skill at or before a date — "the tree as it was". */
export async function snapshotsAsOf(userId: string, asOf: Date) {
  const rows = await db.masterySnapshot.findMany({
    where: { userId, computedAt: { lte: asOf } },
    orderBy: { computedAt: "desc" },
    distinct: ["skillId"],
  });
  return Object.fromEntries(rows.map((r) => [r.skillId, r]));
}
