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

type T = (source: string, vars?: Record<string, string | number>) => string;
const plainT: T = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);

export function generateInsights(categories: InsightCategory[], skills: InsightSkill[], t: T = plainT): string[] {
  const out: string[] = [];
  const evidenced = categories.filter((c) => c.mastery !== null && c.assessed >= 2).sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0));
  if (evidenced.length >= 2) {
    const top = evidenced[0];
    const low = evidenced[evidenced.length - 1];
    if ((top.mastery ?? 0) - (low.mastery ?? 0) >= 10) {
      out.push(t("Your documented work currently shows stronger evidence in {top} than in {low}.", { top: top.name.toLowerCase(), low: low.name.toLowerCase() }));
    } else {
      out.push(t("Evidence across {list} is fairly even so far.", { list: evidenced.map((c) => c.name.toLowerCase()).join(", ") }));
    }
  }
  const empty = categories.filter((c) => c.assessed === 0);
  if (empty.length && empty.length < categories.length) {
    out.push(t("There's no evidence yet for {list}. That's a gap in documentation, not a judgement of ability.", { list: empty.map((c) => c.name.toLowerCase()).join(", ") }));
  }
  const thin = categories.filter((c) => c.assessed > 0 && c.assessed / c.total < 0.2);
  if (thin.length)
    out.push(t(thin.length > 1 ? "{list} have evidence for only a few skills — the picture there is narrow." : "{list} has evidence for only a few skills — the picture there is narrow.", { list: thin.map((c) => c.name).join(", ") }));

  const diffs = skills.map((s) => s.selfMinusPeer).filter((d): d is number => d !== null);
  if (diffs.length >= 2) {
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    if (avg >= 12) out.push(t("Where both exist, your self-assessments tend to sit above what peers observed. Asking reviewers for concrete examples can help calibrate."));
    else if (avg <= -12) out.push(t("Where both exist, peers tend to observe your skills more strongly than you rate yourself."));
    else out.push(t("Your self-assessments broadly agree with peer observations where both exist."));
  }
  if (!out.length) out.push(t("Add a few projects and some peer feedback to start seeing patterns here."));
  return out;
}
