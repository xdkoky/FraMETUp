/**
 * Next-challenge recommendations. Deterministic and explainable: every score is
 * returned with the human-readable reasons that produced it.
 */

export interface RecChallenge {
  id: string;
  title: string;
  difficulty: number; // 1..3
  durationMinutes: number;
  skills: string[];
}

export interface RecSkillState {
  mastery: number | null;
  confidence: number;
  lastPracticedAt: Date | null;
  categoryId: string;
}

export interface RecContext {
  skills: Record<string, RecSkillState>;
  /** prerequisite skill ids per skill id */
  prerequisites: Record<string, string[]>;
  goalSkillIds: string[];
  interestCategoryIds: string[];
  availableMinutes: number | null;
  /** challenge ids already completed or dismissed */
  excluded: string[];
  now: Date;
}

export interface Recommendation {
  challengeId: string;
  score: number;
  reasons: string[];
}

const RECENT_DAYS = 14;

export function recommendChallenges(challenges: RecChallenge[], ctx: RecContext, limit = 3): Recommendation[] {
  const goals = new Set(ctx.goalSkillIds);
  const interests = new Set(ctx.interestCategoryIds);
  const excluded = new Set(ctx.excluded);

  const assessed = Object.values(ctx.skills).filter((s) => s.mastery !== null);
  const avgMastery = assessed.length ? assessed.reduce((s, x) => s + (x.mastery as number), 0) / assessed.length : 35;
  const preferredDifficulty = avgMastery < 40 ? 1 : avgMastery < 65 ? 2 : 3;

  const out: Recommendation[] = [];
  for (const ch of challenges) {
    if (excluded.has(ch.id)) continue;
    let score = 0;
    const reasons: string[] = [];

    const goalHits = ch.skills.filter((s) => goals.has(s));
    if (goalHits.length) {
      score += 3 * goalHits.length;
      reasons.push(`Targets ${goalHits.length} skill${goalHits.length > 1 ? "s" : ""} from your learning goals`);
    }

    const thin = ch.skills.filter((s) => {
      const st = ctx.skills[s];
      return !st || st.mastery === null || st.confidence < 0.3;
    });
    if (thin.length) {
      score += 1.5 * thin.length;
      reasons.push(`Builds evidence where it is thin (${thin.length} skill${thin.length > 1 ? "s" : ""})`);
    }

    const recent = ch.skills.filter((s) => {
      const at = ctx.skills[s]?.lastPracticedAt;
      return at && ctx.now.getTime() - at.getTime() < RECENT_DAYS * 86400000;
    });
    if (recent.length === ch.skills.length && recent.length > 0) {
      score -= 2;
      reasons.push("You practised all of these recently — consider variety");
    }

    // Prerequisite readiness: suggest foundations first, but never block.
    const unready = ch.skills.filter((s) =>
      (ctx.prerequisites[s] ?? []).some((p) => !ctx.skills[p] || ctx.skills[p].mastery === null),
    );
    if (ch.difficulty === 3 && unready.length > ch.skills.length / 2) {
      score -= 1;
      reasons.push("Some foundational skills have no evidence yet — still available, but stretching");
    }

    const cats = new Set(ch.skills.map((s) => ctx.skills[s]?.categoryId).filter(Boolean));
    if ([...cats].some((c) => interests.has(c as string))) {
      score += 1;
      reasons.push("Matches your stated interests");
    }

    if (ctx.availableMinutes !== null) {
      if (ch.durationMinutes <= ctx.availableMinutes) {
        score += 0.5;
      } else {
        score -= 2;
        reasons.push("Longer than the time you have available");
      }
    }

    const diffGap = Math.abs(ch.difficulty - preferredDifficulty);
    score -= diffGap * 0.75;
    if (diffGap === 0) reasons.push("Difficulty fits your current evidence level");

    if (reasons.length === 0) reasons.push("Adds variety to your practice");

    out.push({ challengeId: ch.id, score: Math.round(score * 100) / 100, reasons });
  }

  return out.sort((a, b) => b.score - a.score || a.challengeId.localeCompare(b.challengeId)).slice(0, limit);
}
