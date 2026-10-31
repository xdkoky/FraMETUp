"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Clock, Flame, Lightbulb, SlidersHorizontal, Target, X, XCircle, Zap } from "lucide-react";
import type { WidgetKind } from "@/lib/learn";
import { LessonWidget } from "@/components/learn/widgets";
import { CompareSlider } from "@/components/learn/media";
import { darker } from "@/components/learn/palette";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { completeLesson } from "../actions";
import { Character, characterFor, type Mood } from "@/components/characters/character";
import { Confetti, CountUp } from "@/components/ui/celebrate";
import { play } from "@/lib/sound";

export interface LessonData {
  id: string;
  unit: number;
  unitTitle: string;
  color: string;
  title: string;
  summary: string;
  minutes: number;
  points: string[];
  drill: string;
  widget: WidgetKind | null;
  question: string;
  options: string[];
  answer: number;
  why: string;
  skills: { id: string; name: string }[];
  alreadyDone: boolean;
  next: { id: string; title: string } | null;
  dailyGoal: number;
  track: string;
  references: { src: string; afterSrc: string | null; beforeLabel: string | null; afterLabel: string | null; caption: string; credit: string; license: string; sourceUrl: string | null }[];
}

type Step = { kind: "intro" } | { kind: "point"; i: number } | { kind: "widget" } | { kind: "photos" } | { kind: "drill" } | { kind: "check" } | { kind: "done" };

export function LessonFlow({ data }: { data: LessonData }) {
  const t = useT();
  const steps: Step[] = [
    { kind: "intro" },
    ...data.points.map((_, i) => ({ kind: "point" as const, i })),
    ...(data.widget ? [{ kind: "widget" as const }] : []),
    ...(data.references.length ? [{ kind: "photos" as const }] : []),
    { kind: "drill" },
    { kind: "check" },
    { kind: "done" },
  ];
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<"right" | "wrong" | null>(null);
  const [shake, setShake] = useState(0);
  const [result, setResult] = useState<{ xp: number; streak: number; todayXp: number } | null>(null);
  const [pending, start] = useTransition();
  const step = steps[at];
  const who = characterFor(data.id);
  const POINT_MOODS: Mood[] = ["happy", "thinking", "excited", "determined"];
  const progress = Math.min(1, at / (steps.length - 1));
  const advance = () => setAt((n) => Math.min(steps.length - 1, n + 1));
  const reduce = useReducedMotion();
  const [combo, setCombo] = useState(0);

  // Fanfare when the lesson is finished; a streak chime once the server confirms it.
  useEffect(() => {
    if (step.kind === "done") play("complete");
  }, [step.kind]);
  useEffect(() => {
    if (step.kind === "done" && result && result.xp > 0) {
      const id = setTimeout(() => play("streak"), 1300);
      return () => clearTimeout(id);
    }
  }, [step.kind, result]);

  const check = () => {
    if (picked === null) return;
    if (picked !== data.answer) {
      play("wrong");
      setVerdict("wrong");
      setShake((n) => n + 1);
      return;
    }
    play("correct");
    setCombo((n) => n + 1);
    setVerdict("right");
    start(async () => {
      const res = await completeLesson(data.id, picked);
      if (res.ok) setResult({ xp: res.xp, streak: res.streak, todayXp: res.todayXp });
    });
  };

  const footer = (() => {
    if (step.kind === "done") return null;
    if (step.kind === "check") {
      if (verdict === "right")
        return (
          <Bar tone="right" title={t("Nice work!")} body={data.why}>
            <button type="button" onClick={advance} disabled={pending} className={cn(buttonClass("primary", "lg"), "!bg-success-bright !shadow-[0_4px_0_var(--color-success-strong)] min-w-40")}>
              {t("Continue")}
            </button>
          </Bar>
        );
      if (verdict === "wrong")
        return (
          <Bar tone="wrong" title={t("Not quite")} body={t("Have another look and try again.")}>
            <button
              type="button"
              onClick={() => {
                setVerdict(null);
                setPicked(null);
              }}
              className={cn(buttonClass("danger", "lg"), "min-w-40")}
            >
              {t("Try again")}
            </button>
          </Bar>
        );
      return (
        <Bar>
          <button type="button" data-sound="none" onClick={check} disabled={picked === null} className={cn(buttonClass("primary", "lg"), "min-w-40")}>
            {t("Check")}
          </button>
        </Bar>
      );
    }
    return (
      <Bar>
        <button type="button" onClick={advance} className={cn(buttonClass("primary", "lg"), "min-w-40")} autoFocus>
          {step.kind === "intro" ? t("Start") : t("Continue")}
        </button>
      </Bar>
    );
  })();

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <Link href={`/learn?track=${data.track}`} className="rounded-xl p-1.5 text-faint hover:bg-surface-2 hover:text-muted" aria-label={t("Close lesson")}>
          <X className="size-7" strokeWidth={2.5} />
        </Link>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label={t("Lesson progress")} aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="relative h-full rounded-full bg-success-bright transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]" style={{ width: `${Math.max(4, progress * 100)}%` }}>
            <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/35" aria-hidden />
            {combo > 0 && <span key={combo} className="absolute inset-0 rounded-full animate-[bar-flash_.8s_ease-out]" aria-hidden />}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-x-clip px-4 pb-40 pt-8 sm:px-6">
       <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={at}
          className="flex flex-1 flex-col"
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 48, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -48, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.8 }}
        >
        {step.kind === "intro" && (
          <div className="my-auto flex flex-col-reverse gap-6 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-wide text-white" style={{ background: data.color, boxShadow: `0 3px 0 ${darker(data.color)}` }}>
              {t("Unit {n}", { n: data.unit })} · {data.unitTitle}
            </div>
            <h1 className="font-display text-[2.3rem] font-black leading-tight sm:text-[2.8rem]">{data.title}</h1>
            <p className="mt-3 text-lg font-semibold text-muted">{data.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-[13px] font-bold text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 py-1.5">
                <Clock className="size-4" aria-hidden /> {t("{n} min", { n: data.minutes })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 py-1.5">
                <Lightbulb className="size-4" aria-hidden /> {t("{n} key ideas", { n: data.points.length })}
              </span>
              {data.widget && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 py-1.5">
                  <SlidersHorizontal className="size-4" aria-hidden /> {t("Simulator")}
                </span>
              )}
              {data.alreadyDone && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border-2 border-success/30 bg-success/10 px-3 py-1.5 text-success-strong">
                  <CheckCircle2 className="size-4" aria-hidden /> {t("Completed before")}
                </span>
              )}
            </div>
            {data.skills.length > 0 && (
              <p className="mt-5 text-[13px] font-semibold text-faint">
                {t("Builds:")} {data.skills.map((s) => s.name).join(" · ")}
              </p>
            )}
            </div>
            <Character who={who} mood="happy" className="mx-auto size-36 shrink-0 animate-[bounce-soft_2.4s_ease-in-out_infinite] sm:size-48" />
          </div>
        )}

        {step.kind === "point" && (
          <div key={step.i} className="my-auto">
            <div className="slate-label mb-4" style={{ color: data.color }}>
              {t("Key idea {a} of {b}", { a: step.i + 1, b: data.points.length })}
            </div>
            <div className="flex items-end gap-3 sm:gap-5">
              <Character who={who} mood={POINT_MOODS[step.i % POINT_MOODS.length]} className="size-24 shrink-0 sm:size-36" />
              <div className="relative mb-6 flex-1 rounded-3xl border-2 border-line bg-surface p-5 shadow-[0_4px_0_var(--color-line)] sm:p-6">
                <span className="absolute -left-[11px] bottom-6 size-5 rotate-45 border-b-2 border-l-2 border-line bg-surface" aria-hidden />
                <p className="relative text-[1.25rem] font-bold leading-snug sm:text-[1.45rem]">{data.points[step.i]}</p>
              </div>
            </div>
          </div>
        )}

        {step.kind === "widget" && data.widget && (
          <div className="animate-[pop_.3s_ease-out]">
            <div className="slate-label mb-2" style={{ color: data.color }}>
              {t("Try it")}
            </div>
            <h2 className="mb-5 text-2xl font-black">{t("Play with the controls and watch what changes.")}</h2>
            <LessonWidget kind={data.widget} />
          </div>
        )}

        {step.kind === "photos" && (
          <div className="animate-[pop_.3s_ease-out]">
            <div className="slate-label mb-2" style={{ color: data.color }}>
              {t("See it for real")}
            </div>
            <div className="grid gap-6">
              {data.references.slice(0, 3).map((r) => (
                <figure key={r.src} className="space-y-2">
                  {r.afterSrc ? (
                    <CompareSlider before={r.src} after={r.afterSrc} beforeLabel={r.beforeLabel} afterLabel={r.afterLabel} alt={r.caption} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.src} alt={r.caption} className="w-full rounded-2xl border-2 border-line" />
                  )}
                  <figcaption>
                    <p className="text-[15px] font-bold">{r.caption}</p>
                    <p className="text-[11.5px] font-semibold text-faint">
                      {t("Photo:")} {r.credit} · {t(r.license)}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        {step.kind === "drill" && (
          <div className="my-auto">
            <div className="slate-label mb-2" style={{ color: data.color }}>
              {t("Your drill")}
            </div>
            <div className="flex items-end gap-3 sm:gap-5">
              <Character who={who} mood="determined" className="size-24 shrink-0 sm:size-32" />
              <div className="flex-1 rounded-3xl border-2 border-line p-6 shadow-[0_4px_0_var(--color-line)]">
                <Target className="mb-3 size-9" style={{ color: data.color }} aria-hidden />
                <p className="text-xl font-bold leading-snug">{data.drill}</p>
              </div>
            </div>
            <p className="mt-4 text-[13.5px] font-semibold text-muted">
              {t("Do this with a camera after the lesson. Upload the result as a project to turn it into evidence for your skills.")}
            </p>
          </div>
        )}

        {step.kind === "check" && (
          <div className="animate-[pop_.3s_ease-out]">
            <div className="slate-label mb-2" style={{ color: data.color }}>
              {t("Quick check")}
            </div>
            <div className="mb-6 flex items-end gap-3">
              <Character
                key={verdict ?? "idle"}
                who={who}
                mood={verdict === "right" ? "excited" : verdict === "wrong" ? "worried" : "thinking"}
                className={cn("size-20 shrink-0 sm:size-28", verdict === "right" && "animate-[hop_.6s_cubic-bezier(.22,1,.36,1)]", verdict === "wrong" && "animate-[wobble_.5s_ease-in-out]")}
              />
              <div className="relative mb-3 flex-1 rounded-3xl border-2 border-line bg-surface px-5 py-4 shadow-[0_4px_0_var(--color-line)]">
                <span className="absolute -left-[11px] bottom-5 size-5 rotate-45 border-b-2 border-l-2 border-line bg-surface" aria-hidden />
                <h2 className="relative text-xl font-black leading-snug sm:text-2xl">{data.question}</h2>
              </div>
            </div>
            <div key={shake} className={cn("grid gap-3", shake > 0 && verdict === "wrong" && "animate-[shake_.4s_ease-in-out]")} role="radiogroup" aria-label={data.question}>
              {data.options.map((o, i) => {
                const sel = picked === i;
                const right = verdict === "right" && i === data.answer;
                const wrong = verdict === "wrong" && sel;
                return (
                  <motion.button
                    key={i}
                    type="button"
                    data-sound="select"
                    initial={reduce || shake > 0 ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0, scale: right ? [1, 1.05, 1] : sel ? [1, 1.025, 1] : 1 }}
                    transition={{ opacity: { delay: i * 0.05 }, y: { delay: i * 0.05, type: "spring", stiffness: 500, damping: 30 }, scale: { duration: 0.3 } }}
                    role="radio"
                    aria-checked={sel}
                    disabled={verdict === "right"}
                    onClick={() => {
                      setPicked(i);
                      setVerdict(null);
                    }}
                    className={cn(
                      "press flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-[16px] font-bold",
                      right
                        ? "border-success bg-success/10 text-success-strong shadow-[0_4px_0_var(--color-success)]"
                        : wrong
                          ? "border-danger bg-danger/10 text-danger shadow-[0_4px_0_var(--color-danger)]"
                          : sel
                            ? "border-accent bg-accent-soft text-accent-strong shadow-[0_4px_0_var(--color-accent)]"
                            : "border-line bg-surface text-text shadow-[0_4px_0_var(--color-line)] hover:bg-surface-2",
                    )}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg border-2 text-[13px] font-black", sel || right ? "border-current" : "border-line text-faint")}>{i + 1}</span>
                    {o}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {step.kind === "done" && (
          <div className="my-auto flex flex-col items-center text-center animate-[pop_.4s_ease-out]">
            <div className="relative">
              <Confetti />
              <Character who={who} mood="excited" className="size-40 animate-[bounce-soft_1.4s_ease-in-out_infinite] sm:size-48" />
              <span className="absolute -left-6 top-2 text-3xl" aria-hidden>
                ✨
              </span>
              <span className="absolute -right-4 top-10 text-2xl" aria-hidden>
                🎬
              </span>
            </div>
            <motion.h1
              className="mt-4 font-display text-[2.3rem] font-black text-amber"
              initial={reduce ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.15 }}
            >
              {t("Lesson complete!")}
            </motion.h1>
            <p className="mt-1 font-semibold text-muted">{data.title}</p>
            <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
              <Stat i={0} icon={<Zap className="size-5 fill-white" aria-hidden />} color="var(--color-amber-bright)" label={t("XP earned")} value={result ? <CountUp value={result.xp} prefix="+" sound delay={0.55} /> : "…"} />
              <Stat i={1} icon={<Flame className="size-5 fill-white" aria-hidden />} color="#F27522" label={t("Day streak")} value={result ? <CountUp value={result.streak} delay={0.7} /> : "…"} />
              <Stat i={2} icon={<Target className="size-5" aria-hidden />} color="var(--color-success-bright)" label={t("Daily goal")} value={result ? <><CountUp value={Math.min(result.todayXp, data.dailyGoal)} delay={0.85} />/{data.dailyGoal}</> : "…"} />
            </div>
            {result && result.xp === 0 && data.alreadyDone && <p className="mt-4 text-[13px] font-semibold text-faint">{t("You already finished this lesson, so there is no new XP — but practice never hurts.")}</p>}
            <div className="mt-10 flex w-full max-w-md flex-col gap-3">
              {data.next && (
                <Link href={`/lesson/${data.next.id}`} className={buttonClass("primary", "lg", "w-full")}>
                  {t("Next lesson")}: {data.next.title}
                </Link>
              )}
              <Link href={`/learn/${data.id}`} className={buttonClass("secondary", "lg", "w-full")}>
                {t("Photos, videos & class examples")}
              </Link>
              <Link href={`/learn?track=${data.track}`} className={buttonClass("ghost", "lg", "w-full")}>
                {t("Back to the path")}
              </Link>
            </div>
          </div>
        )}
        </motion.div>
       </AnimatePresence>
      </main>

      <AnimatePresence mode="popLayout" initial={false}>
        {footer && (
          <motion.div
            key={step.kind === "check" ? `check-${verdict ?? "idle"}` : "bar"}
            initial={verdict && step.kind === "check" && !reduce ? { y: "100%" } : { opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-30"
          >
            {footer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Bar({ tone, title, body, children }: { tone?: "right" | "wrong"; title?: string; body?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "border-t-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4",
        tone === "right" ? "border-transparent bg-[var(--color-success-wash)]" : tone === "wrong" ? "border-transparent bg-[var(--color-danger-wash)]" : "border-line bg-surface",
      )}
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {title ? (
          <div className={cn("flex gap-3", tone === "right" ? "text-success-strong" : "text-danger-strong")}>
            {tone === "right" ? <CheckCircle2 className="size-9 shrink-0" aria-hidden /> : <XCircle className="size-9 shrink-0" aria-hidden />}
            <div>
              <div className="text-xl font-black">{title}</div>
              {body && <p className="text-[14px] font-semibold opacity-90">{body}</p>}
            </div>
          </div>
        ) : (
          <span />
        )}
        <div className="flex justify-end">{children}</div>
      </div>
    </div>
  );
}

function Stat({ i, icon, color, label, value }: { i: number; icon: React.ReactNode; color: string; label: string; value: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="overflow-hidden rounded-2xl border-2"
      style={{ borderColor: color }}
      initial={reduce ? false : { y: 24, opacity: 0, scale: 0.85 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.4 + i * 0.12 }}
    >
      <div className="flex items-center justify-center gap-1 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white" style={{ background: color }}>
        {icon} {label}
      </div>
      <div className="py-3 text-2xl font-black" style={{ color }}>
        {value}
      </div>
    </motion.div>
  );
}
