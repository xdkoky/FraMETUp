import "server-only";
import { db } from "@/lib/db";
import type { MasteryResult } from "@/lib/assessment/engine";
import { computeRadialLayout } from "@/lib/graph/layout";
import { semesterForDate, semesterLabel, semesterRange } from "@/lib/semester";
import { practiceTier } from "@/lib/xp/xp";
import type { SkillExtras, SkillStatus, TimeSlice, TreeData } from "@/components/skill-tree/types";
import { computeAll } from "./mastery";
import { getTaxonomy } from "./taxonomy";
import { getLocale, getT } from "@/i18n/server";
import { CHALLENGES_HU } from "@/lib/taxonomy/hu";
import { localizedSubskills } from "@/lib/taxonomy/subskills";
import { getDrillPractice } from "./practice";

export function toStatus(r: MasteryResult): SkillStatus {
  return {
    mastery: r.mastery,
    confidence: r.confidence,
    confidenceBand: r.confidenceBand,
    state: r.state,
    selfReportedOnly: r.selfReportedOnly,
    breakdown: r.breakdown,
    missingSources: r.missingSources,
    discrepancy: r.discrepancy,
    needsReassessment: r.needsReassessment,
    practiced: r.practiced,
    explanation: r.explanation,
    distinctContexts: r.distinctContexts,
    distinctReviewers: r.distinctReviewers,
    lastEvidenceAt: r.lastEvidenceAt ? r.lastEvidenceAt.toISOString() : null,
  };
}

export async function recentlyImprovedSkills(userId: string, days = 45) {
  const since = new Date(Date.now() - days * 86400000);
  const recent = await db.masterySnapshot.findMany({ where: { userId, computedAt: { gte: since } }, orderBy: { computedAt: "asc" } });
  if (!recent.length) return [];
  const prior = await db.masterySnapshot.findMany({
    where: { userId, computedAt: { lt: since }, skillId: { in: [...new Set(recent.map((r) => r.skillId))] } },
    orderBy: { computedAt: "desc" },
    distinct: ["skillId"],
  });
  const before = new Map(prior.map((p) => [p.skillId, p.mastery]));
  const latest = new Map<string, number | null>();
  for (const r of recent) latest.set(r.skillId, r.mastery);
  return [...latest.entries()]
    .filter(([id, m]) => m !== null && (before.get(id) ?? null) === null ? true : m !== null && m > (before.get(id) as number) + 2)
    .map(([id]) => id);
}

export async function getTreeData(user: { id: string; displayName: string; enrollmentYear: number | null }): Promise<TreeData> {
  const taxonomy = await getTaxonomy();
  const skills = taxonomy.skills.filter((s) => !s.archived);
  const layout = computeRadialLayout(taxonomy.categories, skills, taxonomy.edges);

  const t = await getT();
  const hu = (await getLocale()) === "hu";
  const now = new Date();
  const current = await computeAll(user.id, undefined, t);
  const status = Object.fromEntries(Object.entries(current).map(([k, v]) => [k, toStatus(v)]));
  const slices: TimeSlice[] = [{ key: "now", label: t("Now"), states: status }];
  if (user.enrollmentYear) {
    const currentSem = semesterForDate(user.enrollmentYear, now);
    for (let sem = currentSem - 1; sem >= 1 && sem >= currentSem - 8; sem--) {
      const end = new Date(semesterRange(user.enrollmentYear, sem).end.getTime() - 1000);
      const past = await computeAll(user.id, end, t);
      slices.push({
        key: `s${sem}`,
        label: semesterLabel(user.enrollmentYear, sem, t),
        states: Object.fromEntries(Object.entries(past).map(([k, v]) => [k, toStatus(v)])),
      });
    }
  }

  const [links, challengeSkills, goals, xpAgg, recentlyImproved, practice] = await Promise.all([
    db.skillEvidenceLink.findMany({
      where: { project: { ownerId: user.id, deletedAt: null } },
      include: { project: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.challengeSkill.findMany({ include: { challenge: { select: { id: true, title: true } } } }),
    db.learningGoalSkill.findMany({ where: { goal: { userId: user.id, status: "ACTIVE" } }, select: { skillId: true } }),
    db.experienceEvent.aggregate({ where: { userId: user.id }, _sum: { awardedXp: true } }),
    recentlyImprovedSkills(user.id),
    getDrillPractice(user.id, now),
  ]);

  const extras: Record<string, SkillExtras> = {};
  const ex = (id: string) => (extras[id] ??= { projects: [], challenges: [] });
  for (const l of links) ex(l.skillId).projects.push({ id: l.project.id, title: l.project.title, level: l.demonstratedLevel, relevance: l.relevance });
  for (const c of challengeSkills) ex(c.skillId).challenges.push(hu && CHALLENGES_HU[c.challenge.id] ? { id: c.challenge.id, title: CHALLENGES_HU[c.challenge.id].title } : c.challenge);

  return {
    categories: taxonomy.categories.map((c) => ({ id: c.id, code: c.code, name: c.name, color: c.color, description: c.description })),
    skills: skills.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      name: s.name,
      description: s.description,
      outcomes: s.outcomes,
      criteria: s.criteria,
      levels: s.levels,
      evidenceTypes: s.evidenceTypes,
      exercises: s.exercises,
      subskills: localizedSubskills(s.id, hu ? "hu" : "en"),
    })),
    edges: taxonomy.edges.filter((e) => taxonomy.skillById[e.from] && taxonomy.skillById[e.to]),
    positions: {
      skills: Object.fromEntries(Object.entries(layout.skills).map(([k, v]) => [k, { x: v.x, y: v.y }])),
      categories: Object.fromEntries(Object.entries(layout.categories).map(([k, v]) => [k, { x: v.x, y: v.y }])),
      radius: layout.radius,
    },
    status,
    slices,
    recentlyImproved,
    goalSkills: [...new Set(goals.map((g) => g.skillId))],
    extras,
    practice,
    displayName: user.displayName,
    tierName: t(practiceTier(xpAgg._sum.awardedXp ?? 0).name),
  };
}
