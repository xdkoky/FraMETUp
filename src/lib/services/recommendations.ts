import "server-only";
import { db } from "@/lib/db";
import { recommendChallenges } from "@/lib/recommend/recommend";
import type { MasteryMap } from "./mastery";
import { localizeChallenges } from "./challenges";
import { getT } from "@/i18n/server";
import type { getTaxonomy } from "./taxonomy";

export async function getRecommendations(
  userId: string,
  mastery: MasteryMap,
  taxonomy: Awaited<ReturnType<typeof getTaxonomy>>,
  opts: { availableMinutes?: number | null; limit?: number } = {},
) {
  const t = await getT();
  const [rawChallenges, completions, goals, profile, links] = await Promise.all([
    db.challenge.findMany({ include: { skills: true } }),
    db.challengeCompletion.findMany({ where: { userId } }),
    db.learningGoalSkill.findMany({ where: { goal: { userId, status: "ACTIVE" } } }),
    db.userProfile.findUnique({ where: { userId } }),
    db.skillEvidenceLink.findMany({ where: { project: { ownerId: userId, deletedAt: null } }, select: { skillId: true, updatedAt: true } }),
  ]);
  const challenges = await localizeChallenges(rawChallenges);
  const lastPracticed = new Map<string, Date>();
  for (const l of links) if (!lastPracticed.has(l.skillId) || lastPracticed.get(l.skillId)! < l.updatedAt) lastPracticed.set(l.skillId, l.updatedAt);

  const prerequisites: Record<string, string[]> = {};
  for (const e of taxonomy.edges) if (e.kind === "PREREQUISITE") (prerequisites[e.to] ??= []).push(e.from);

  const recs = recommendChallenges(
    challenges.map((c) => ({ id: c.id, title: c.title, difficulty: c.difficulty, durationMinutes: c.durationMinutes, skills: c.skills.map((s) => s.skillId) })),
    {
      skills: Object.fromEntries(
        taxonomy.skills.map((s) => [
          s.id,
          { mastery: mastery[s.id]?.mastery ?? null, confidence: mastery[s.id]?.confidence ?? 0, lastPracticedAt: lastPracticed.get(s.id) ?? null, categoryId: s.categoryId },
        ]),
      ),
      prerequisites,
      goalSkillIds: goals.map((g) => g.skillId),
      interestCategoryIds: profile?.interests ?? [],
      availableMinutes: opts.availableMinutes ?? null,
      excluded: completions.map((c) => c.challengeId),
      now: new Date(),
    },
    opts.limit ?? 3,
    t,
  );
  const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
  return recs.map((r) => ({ ...r, challenge: byId[r.challengeId] }));
}
