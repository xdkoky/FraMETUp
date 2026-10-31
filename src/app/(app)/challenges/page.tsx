import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Package, Sparkles, Target } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDevelopment } from "@/lib/services/development";
import { getRecommendations } from "@/lib/services/recommendations";
import { localizeChallenges } from "@/lib/services/challenges";
import { STATE_STYLE } from "@/lib/skill-state";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { acceptChallenge, completeChallenge, dismissChallenge, restoreChallenge } from "./actions";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Challenges") };
}

const TIME_OPTIONS = [
  { v: "", l: "Any length" },
  { v: "90", l: "Up to 1½ hours" },
  { v: "240", l: "Up to half a day" },
  { v: "480", l: "Up to a day" },
];

function duration(min: number, t: (s: string, v?: Record<string, string | number>) => string) {
  return min < 60 ? t("{n} min", { n: min }) : t("{n} h", { n: min % 60 === 0 ? min / 60 : (min / 60).toFixed(1) });
}

export default async function ChallengesPage({ searchParams }: { searchParams: Promise<{ time?: string }> }) {
  const t = await getT();
  const user = await requireUser();
  const { time } = await searchParams;
  const { taxonomy, mastery } = await getDevelopment(user.id);
  const [rawChallenges, completions, projects, recs] = await Promise.all([
    db.challenge.findMany({ include: { skills: true }, orderBy: [{ difficulty: "asc" }, { title: "asc" }] }),
    db.challengeCompletion.findMany({ where: { userId: user.id } }),
    db.project.findMany({ where: { ownerId: user.id, deletedAt: null }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" } }),
    getRecommendations(user.id, mastery, taxonomy, { availableMinutes: time ? Number(time) : null, limit: 3 }),
  ]);
  const challenges = await localizeChallenges(rawChallenges);
  const status = new Map(completions.map((c) => [c.challengeId, c]));
  const recIds = new Set(recs.map((r) => r.challengeId));

  return (
    <Page>
      <PageHeader
        eyebrow={t("Personalised practice")}
        title={t("Next challenges")}
        description={t("Practical exercises chosen from your goals, thin evidence and the skill graph. Accept, adapt them in your own words, or set them aside.")}
      />
      <Card className="mb-8 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-amber" aria-hidden />{" "}{t("Recommended for you")}
          </div>
          <form className="flex items-center gap-2 text-xs text-muted">
            <label htmlFor="time">{t("Time available")}</label>
            <select id="time" name="time" defaultValue={time ?? ""} className="rounded-md border border-line bg-ink/60 px-2 py-1 text-xs">
              {TIME_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {t(o.l)}
                </option>
              ))}
            </select>
            <button className="rounded-md border border-line px-2 py-1 hover:text-text">{t("Update")}</button>
          </form>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {recs.map((r) => (
            <a key={r.challengeId} href={`#${r.challengeId}`} className="rounded-xl border border-amber/25 bg-amber-soft/50 p-4 hover:border-amber/50">
              <div className="text-sm font-semibold">{r.challenge.title}</div>
              <ul className="mt-2 space-y-1 text-[11.5px] text-muted">
                {r.reasons.slice(0, 3).map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </a>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-faint">{t("Recommendations are deterministic and explained — no hidden scoring. Prerequisites guide suggestions but never lock anything.")}</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {challenges.map((c) => {
          const st = status.get(c.id);
          return (
            <Card key={c.id} className={`p-5 scroll-mt-24 ${st?.status === "DISMISSED" ? "opacity-50" : ""}`}>
              <article id={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {recIds.has(c.id) && <Badge tone="amber">{t("Recommended")}</Badge>}
                      {st?.status === "ACCEPTED" && <Badge tone="accent">{t("In progress")}</Badge>}
                      {st?.status === "COMPLETED" && (
                        <Badge tone="success">
                          <CheckCircle2 className="size-3" aria-hidden />{" "}{t("Completed")}
                        </Badge>
                      )}
                    </div>
                    <h2 className="mt-2 font-display text-[1.75rem] leading-tight">{c.title}</h2>
                  </div>
                  <Target className="size-5 text-amber shrink-0" aria-hidden />
                </div>
                <p className="mt-2 text-muted">{c.objective}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-faint">
                  <span>{t("Difficulty")}{" "}{"●".repeat(c.difficulty)}{"○".repeat(3 - c.difficulty)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" aria-hidden /> {duration(c.durationMinutes, t)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Package className="size-3" aria-hidden /> {c.resources.join(" · ")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.skills.map((s) => {
                    const state = mastery[s.skillId]?.state ?? "NOT_ASSESSED";
                    return (
                      <Link key={s.skillId} href={`/skills?skill=${s.skillId}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-[11px] text-muted hover:text-text">
                        <span className="size-1.5 rounded-full" style={{ background: STATE_STYLE[state].color }} aria-hidden />
                        {taxonomy.skillById[s.skillId]?.name}
                      </Link>
                    );
                  })}
                </div>
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-accent">{t("Brief, criteria & reflection")}</summary>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="slate-label mb-1">{t("Instructions")}</div>
                      <ol className="list-decimal pl-4 space-y-1 text-muted text-[13px]">
                        {c.instructions.map((i) => <li key={i}>{i}</li>)}
                      </ol>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="slate-label mb-1">{t("Completion criteria")}</div>
                        <ul className="list-disc pl-4 space-y-0.5 text-muted text-[13px]">{c.completionCriteria.map((i) => <li key={i}>{i}</li>)}</ul>
                      </div>
                      <div>
                        <div className="slate-label mb-1">{t("Suggested evidence")}</div>
                        <ul className="list-disc pl-4 space-y-0.5 text-muted text-[13px]">{c.suggestedEvidence.map((i) => <li key={i}>{i}</li>)}</ul>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="slate-label mb-1">{t("Reflection questions")}</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted text-[13px]">{c.reflectionQuestions.map((i) => <li key={i}>{i}</li>)}</ul>
                    </div>
                  </div>
                </details>

                {st?.personalNotes && <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">{t("Your version:")}{" "}{st.personalNotes}</p>}

                <div className="mt-4 border-t border-line-soft pt-4">
                  {!st || st.status === "DISMISSED" ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <form action={acceptChallenge.bind(null, c.id)} className="flex flex-1 flex-wrap items-end gap-2">
                        <input name="personalNotes" placeholder={t("Adapt it (optional): e.g. use my own scene, shorter take…")} className="h-8 min-w-48 flex-1 rounded-lg border border-line bg-ink/60 px-3 text-xs placeholder:text-faint focus:border-accent focus:outline-none" aria-label={t("Your adaptation")} />
                        <Button size="sm">{t("Accept")}</Button>
                      </form>
                      {st?.status === "DISMISSED" ? (
                        <form action={restoreChallenge.bind(null, c.id)}>
                          <Button size="sm" variant="ghost">{t("Restore")}</Button>
                        </form>
                      ) : (
                        <form action={dismissChallenge.bind(null, c.id)}>
                          <Button size="sm" variant="ghost">{t("Not for me")}</Button>
                        </form>
                      )}
                    </div>
                  ) : st.status === "ACCEPTED" ? (
                    <form action={completeChallenge.bind(null, c.id)} className="flex flex-wrap items-center gap-2">
                      <select name="projectId" className="h-8 rounded-lg border border-line bg-ink/60 px-2 text-xs" aria-label={t("Link to a project")}>
                        <option value="">{t("Link to a project (optional)")}</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="amber">{t("Mark completed")}</Button>
                    </form>
                  ) : (
                    <p className="text-xs text-faint">{t("Completed. Add a reflection on the linked project to turn it into evidence.")}</p>
                  )}
                </div>
              </article>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
