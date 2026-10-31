import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Check, Flame, Star, Trophy, Zap } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLearnProgress } from "@/lib/services/learn";
import { TRACK_BY_ID, TRACKS, pick, trackLessons } from "@/lib/learn";
import { DAILY_GOAL } from "@/lib/learn/progress";
import { Page } from "@/components/shell/page";
import { Meter } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { darker, unitColor } from "@/components/learn/palette";
import { cn } from "@/lib/utils";
import { Character, type CharacterId, type Mood } from "@/components/characters/character";

const GUIDES: [CharacterId, Mood][] = [["mira", "happy"], ["leo", "excited"], ["zsofi", "thinking"], ["kai", "determined"], ["noor", "happy"]];
import { getLocale, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Cinematography") };
}

/** Horizontal offsets (px) that make the path wind. */
const WIND = [0, 52, 78, 52, 0, -52, -78, -52];

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const user = await requireUser();
  const { done, streak, activeToday, todayXp } = await getLearnProgress(user.id);
  const track = TRACK_BY_ID[(await searchParams).track ?? ""] ?? TRACKS[0];
  const lessons = trackLessons(track);
  const next = lessons.find((l) => !done.has(l.id)) ?? null;
  const total = lessons.length;
  const finished = lessons.filter((l) => done.has(l.id)).length;

  return (
    <Page className="max-w-5xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="order-2 lg:order-1">
          <div role="tablist" aria-label={t("Learning tracks")} className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border-2 border-line bg-surface-2 p-1.5">
            {TRACKS.map((tr) => {
              const on = tr.id === track.id;
              return (
                <Link
                  key={tr.id}
                  href={`/learn?track=${tr.id}`}
                  role="tab"
                  aria-selected={on}
                  scroll={false}
                  className={cn(
                    "press rounded-xl px-3 py-2.5 text-center text-[13px] font-extrabold uppercase tracking-wide",
                    on ? "bg-surface text-accent shadow-[0_3px_0_var(--color-line-strong)]" : "text-muted hover:text-text",
                  )}
                >
                  {pick(tr.title, locale)}
                </Link>
              );
            })}
          </div>
          <header className="mb-6">
            <div className="slate-label mb-2">{track.id === "directing" ? t("Directing track") : t("Cinematography track")}</div>
            <h1 className="font-display text-[2.1rem] font-black leading-tight md:text-[2.6rem]">{track.id === "directing" ? t("Learn to direct") : t("Learn the DoP's craft")}</h1>
            <p className="mt-2 max-w-xl text-muted">{pick(track.blurb, locale)}</p>
          </header>

          {track.modules.map((m, mi) => {
            const color = unitColor(mi);
            const mDone = m.lessons.filter((l) => done.has(l.id)).length;
            return (
              <section key={m.id} className="mb-12" aria-labelledby={`unit-${m.id}`}>
                <div className="rounded-2xl px-5 py-4 text-white" style={{ background: color, boxShadow: `0 4px 0 ${darker(color)}` }}>
                  <div className="text-[12px] font-extrabold uppercase tracking-wider opacity-85">
                    {t("Unit {n}", { n: mi + 1 })} · {t("{a} of {b} done", { a: mDone, b: m.lessons.length })}
                  </div>
                  <h2 id={`unit-${m.id}`} className="mt-0.5 text-xl font-black">
                    {pick(m.title, locale)}
                  </h2>
                  <p className="mt-0.5 text-[13.5px] font-semibold opacity-90">{pick(m.blurb, locale)}</p>
                </div>

                <div className="relative">
                <Character
                  who={GUIDES[mi % GUIDES.length][0]}
                  mood={mDone === m.lessons.length ? "excited" : GUIDES[mi % GUIDES.length][1]}
                  className={cn("pointer-events-none absolute top-24 hidden size-36 sm:block", mi % 2 ? "left-0" : "right-0")}
                />
                <ol className="mt-16 flex flex-col items-center gap-7">
                  {m.lessons.map((l, li) => {
                    const isDone = done.has(l.id);
                    const isNext = next?.id === l.id;
                    const off = WIND[(li + mi * 2) % WIND.length];
                    return (
                      <li key={l.id} className="flex flex-col items-center" style={{ transform: `translateX(${off}px)` }}>
                        <Link
                          href={`/lesson/${l.id}`}
                          aria-label={`${pick(l.title, locale)}${isDone ? ` — ${t("completed")}` : ""}`}
                          className="press relative grid size-[72px] place-items-center rounded-full"
                          style={
                            isDone || isNext
                              ? { background: color, boxShadow: `0 6px 0 ${darker(color)}` }
                              : { background: "var(--color-surface-3)", boxShadow: "0 6px 0 var(--color-line-strong)" }
                          }
                        >
                          {isNext && (
                            <span className="absolute -top-11 whitespace-nowrap rounded-xl border-2 border-line bg-surface px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-wide shadow-[0_3px_0_var(--color-line)] animate-[bounce-soft_1.6s_ease-in-out_infinite]" style={{ color }}>
                              {finished ? t("Continue") : t("Start")}
                            </span>
                          )}
                          {isDone ? (
                            <Check className="size-8 text-white" strokeWidth={3.5} aria-hidden />
                          ) : isNext ? (
                            <Star className="size-8 fill-white text-white" aria-hidden />
                          ) : (
                            <BookOpen className="size-7 text-faint" strokeWidth={2.5} aria-hidden />
                          )}
                        </Link>
                        <Link href={`/learn/${l.id}`} className={cn("mt-3 max-w-[170px] text-center text-[13px] font-extrabold leading-tight underline-offset-2 hover:underline", isDone || isNext ? "text-text" : "text-muted")}>
                          {pick(l.title, locale)}
                        </Link>
                        <span className="text-[11.5px] font-bold text-faint">{t("{n} min", { n: l.minutes })}</span>
                      </li>
                    );
                  })}
                </ol>
                </div>
              </section>
            );
          })}
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <Trophy className="size-10 text-amber-bright" aria-hidden />
            <p className="max-w-sm text-sm font-bold text-muted">
              {track.id === "directing" ? t("Finish every unit, then direct a short with everything you've learned.") : t("Finish every unit, then shoot the capstone: be the DoP on a classmate's short.")}
            </p>
          </div>
        </div>

        <aside className="order-1 lg:order-2">
          <div className="space-y-4 lg:sticky lg:top-8">
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
              <div className="card flex items-center gap-3 p-3 lg:p-4">
                <Flame className={cn("size-8 shrink-0", activeToday ? "fill-amber-bright text-amber" : "text-faint")} aria-hidden />
                <div className="min-w-0">
                  <div className="text-xl font-black leading-none">{streak}</div>
                  <div className="text-[11.5px] font-bold text-muted">{t("day streak")}</div>
                </div>
              </div>
              <div className="card flex items-center gap-3 p-3 lg:p-4">
                <Zap className="size-8 shrink-0 fill-amber-bright text-amber" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-black leading-none">
                    {todayXp}
                    <span className="text-[13px] font-bold text-faint">/{DAILY_GOAL}</span>
                  </div>
                  <div className="text-[11.5px] font-bold text-muted">{t("XP today")}</div>
                  <Meter className="mt-1.5 hidden lg:block" value={Math.min(todayXp, DAILY_GOAL)} max={DAILY_GOAL} color="var(--color-amber-bright)" label={t("Daily goal")} />
                </div>
              </div>
              <div className="card flex items-center gap-3 p-3 lg:p-4">
                <Trophy className="size-8 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0">
                  <div className="text-xl font-black leading-none">
                    {finished}
                    <span className="text-[13px] font-bold text-faint">/{total}</span>
                  </div>
                  <div className="text-[11.5px] font-bold text-muted">{t("lessons")}</div>
                </div>
              </div>
            </div>
            {next && (
              <div className="card hidden p-5 lg:block">
                <Character who="mira" mood="excited" className="mx-auto -mt-2 mb-2 size-24" />
                <div className="slate-label">{t("Up next")}</div>
                <div className="mt-1 text-[15px] font-extrabold">{pick(next.title, locale)}</div>
                <p className="mt-1 text-[13px] text-muted">{pick(next.summary, locale)}</p>
                <Link href={`/lesson/${next.id}`} className={buttonClass("primary", "md", "mt-4 w-full")}>
                  {finished ? t("Continue") : t("Start")}
                </Link>
              </div>
            )}
            <p className="hidden px-1 text-[12px] font-semibold text-faint lg:block">
              {t("Lessons earn XP and keep your streak. Your skill levels still move only with evidence: projects, self-assessment and feedback.")}
            </p>
          </div>
        </aside>
      </div>
    </Page>
  );
}
