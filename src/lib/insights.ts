/**
 * Descriptive, non-diagnostic observations about a development profile.
 * Language rules: describe documented evidence, never the person; no rankings.
 */

export interface InsightCategory {
  id: string;
  name: string;
  mastery: number | null;
  assessed: number;
  total: number;
}

export interface InsightSkill {
  selfMinusPeer: number | null; // positive = self higher
}

export function generateInsights(categories: InsightCategory[], skills: InsightSkill[]): string[] {
  const out: string[] = [];
  const evidenced = categories.filter((c) => c.mastery !== null && c.assessed >= 2).sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0));
  if (evidenced.length >= 2) {
    const top = evidenced[0];
    const low = evidenced[evidenced.length - 1];
    if ((top.mastery ?? 0) - (low.mastery ?? 0) >= 10) {
      out.push(`Your documented work currently shows stronger evidence in ${top.name.toLowerCase()} than in ${low.name.toLowerCase()}.`);
    } else {
      out.push(`Evidence across ${evidenced.map((c) => c.name.toLowerCase()).join(", ")} is fairly even so far.`);
    }
  }
  const empty = categories.filter((c) => c.assessed === 0);
  if (empty.length && empty.length < categories.length) {
    out.push(`There's no evidence yet for ${empty.map((c) => c.name.toLowerCase()).join(", ")}. That's a gap in documentation, not a judgement of ability.`);
  }
  const thin = categories.filter((c) => c.assessed > 0 && c.assessed / c.total < 0.2);
  if (thin.length) out.push(`${thin.map((c) => c.name).join(", ")} ${thin.length > 1 ? "have" : "has"} evidence for only a few skills — the picture there is narrow.`);

  const diffs = skills.map((s) => s.selfMinusPeer).filter((d): d is number => d !== null);
  if (diffs.length >= 2) {
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    if (avg >= 12) out.push("Where both exist, your self-assessments tend to sit above what peers observed. Asking reviewers for concrete examples can help calibrate.");
    else if (avg <= -12) out.push("Where both exist, peers tend to observe your skills more strongly than you rate yourself.");
    else out.push("Your self-assessments broadly agree with peer observations where both exist.");
  }
  if (!out.length) out.push("Add a few projects and some peer feedback to start seeing patterns here.");
  return out;
}
