"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ListChecks,
  Loader2,
  Megaphone,
  PenTool,
  Presentation,
  RotateCcw,
  Scissors,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button, buttonClass } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { LocaleSwitch } from "@/i18n/locale-switch";
import { cn } from "@/lib/utils";
import type { Answer, Answers, Level, Question } from "@/lib/quiz/questions";
import { skipQuiz, submitQuiz, type QuizOutcome } from "./actions";
import { FloorPlan, FrameIllustration, LightIllustration, ShotPanel } from "./illustrations";

const ICONS = { Users, ListChecks, PenTool, Scissors, Video, Megaphone, Presentation, BookOpen } as const;
const LETTERS = ["A", "B", "C", "D", "E"];
const PAIR_COLORS = ["#6E9BFF", "#E8B04B", "#7CC79A", "#E58FB0"];

type SkillInfo = { name: string; category: string; color: string; levels: string[] };

/** Stable shuffle so server and client agree and the order doesn't jump between renders. */
function shuffle<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isAnswered(q: Question, a: Answer | undefined) {
  if (q.kind === "multi") return true; // "none of these" is a valid answer
  if (q.kind === "order") return Array.isArray(a) && a.length === q.items.length;
  if (q.kind === "match") return Array.isArray(a) && a.length === q.pairs.length;
  return typeof a === "string";
}

export function QuizFlow({
  questions,
  skills,
  firstName,
  retake,
}: {
  questions: Question[];
  skills: Record<string, SkillInfo>;
  firstName: string;
  retake: boolean;
}) {
  const t = useT();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(-1); // -1 = intro
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<QuizOutcome | null>(null);
  const [pending, start] = useTransition();

  const q = step >= 0 ? questions[step] : null;
  const set = (id: string, a: Answer) => setAnswers((prev) => ({ ...prev, [id]: a }));
  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };
  const finish = () =>
    start(async () => {
      const r = await submitQuiz(answers);
      setResult(r);
      setStep(questions.length);
    });

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -40 }),
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Wordmark />
        <LocaleSwitch />
      </div>

      {step >= 0 && step < questions.length && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-faint">
            <span className="slate-label">{t("Starting-point quiz")}</span>
            <span className="font-mono tabular-nums">
              {step + 1} / {questions.length}
            </span>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {questions.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full bg-accent"
                  initial={false}
                  animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.section
          key={step}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="card relative overflow-hidden p-6 sm:p-8"
        >
          {step === -1 && <Intro firstName={firstName} retake={retake} onStart={() => go(0)} />}

          {q && (
            <>
              <h1 className="font-display text-[1.75rem] leading-tight sm:text-[2.1rem]">{t(q.prompt)}</h1>
              {q.hint && <p className="mt-2 text-sm text-muted">{t(q.hint)}</p>}
              <div className="mt-6">
                <QuestionBody q={q} answer={answers[q.id]} onAnswer={(a) => set(q.id, a)} />
              </div>
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => go(step - 1)}>
                  <ArrowLeft className="size-4" aria-hidden /> {t("Back")}
                </Button>
                {step < questions.length - 1 ? (
                  <Button onClick={() => go(step + 1)} disabled={!isAnswered(q, answers[q.id])}>
                    {q.kind === "multi" && !(answers[q.id] as string[] | undefined)?.length ? t("None of these") : t("Next")}
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                ) : (
                  <Button onClick={finish} disabled={!isAnswered(q, answers[q.id]) || pending} variant="amber">
                    {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                    {t("See my starting map")}
                  </Button>
                )}
              </div>
            </>
          )}

          {step === questions.length && result && <Results result={result} skills={skills} onRetry={() => go(0)} />}
        </motion.section>
      </AnimatePresence>

      {step < questions.length && (
        <form action={skipQuiz} className="mt-4 text-center">
          <button className="text-sm text-faint hover:text-text underline-offset-4 hover:underline">{t("Skip for now — I'll do it later")}</button>
        </form>
      )}
    </div>
  );
}

function Intro({ firstName, retake, onStart }: { firstName: string; retake: boolean; onStart: () => void }) {
  const t = useT();
  return (
    <div className="text-center py-4">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Sparkles className="size-6" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-[2.1rem] sm:text-[2.6rem]">{retake ? t("Take the quiz again") : t("Let's find your starting point, {name}.", { name: firstName })}</h1>
      <p className="mx-auto mt-3 max-w-lg text-muted leading-relaxed">
        {t("Eleven quick, hands-on questions — tap, choose and arrange. Your answers give your skill tree a first, provisional shape.")}
      </p>
      <ul className="mx-auto mt-6 grid max-w-xl gap-2 text-left text-sm sm:grid-cols-3">
        {[t("About 3 minutes"), t("No wrong way to start"), t("You can change everything later")].map((x) => (
          <li key={x} className="flex items-center gap-2 rounded-xl border border-line-soft bg-ink/40 px-3 py-2.5 text-muted">
            <Check className="size-4 shrink-0 text-success" aria-hidden /> {x}
          </li>
        ))}
      </ul>
      <Button size="lg" className="mt-8" onClick={onStart}>
        {t("Start the quiz")} <ArrowRight className="size-4" aria-hidden />
      </Button>
      <p className="mt-4 text-xs text-faint">{t("Results are saved as self-reported starting levels (never above “proficient”) — feedback and projects will refine them.")}</p>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  children,
  className,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl border p-3 text-left transition-all duration-200",
        selected ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--color-accent)]" : "border-line-soft bg-ink/40 hover:-translate-y-0.5 hover:border-line",
        className,
      )}
    >
      {children}
      {selected && (
        <span className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-accent text-white">
          <Check className="size-3.5" aria-hidden />
        </span>
      )}
    </button>
  );
}

function QuestionBody({ q, answer, onAnswer }: { q: Question; answer: Answer | undefined; onAnswer: (a: Answer) => void }) {
  const t = useT();

  if (q.kind === "multi") {
    const picked = new Set((answer as string[] | undefined) ?? []);
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="group">
        {q.options.map((o) => {
          const Icon = ICONS[o.icon as keyof typeof ICONS] ?? Check;
          const on = picked.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = new Set(picked);
                if (on) next.delete(o.id);
                else next.add(o.id);
                onAnswer([...next]);
              }}
              className={cn(
                "flex flex-col items-start gap-3 rounded-2xl border p-4 text-left text-sm transition-all duration-200",
                on ? "border-accent bg-accent-soft text-text" : "border-line-soft bg-ink/40 text-muted hover:-translate-y-0.5 hover:border-line hover:text-text",
              )}
            >
              <span className={cn("flex size-9 items-center justify-center rounded-xl", on ? "bg-accent text-white" : "bg-surface-2 text-faint")}>
                {on ? <Check className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
              </span>
              <span className="leading-snug">{t(o.label)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (q.kind === "visual") {
    const Illus = q.id === "light" ? LightIllustration : FrameIllustration;
    return (
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
        {q.options.map((o, i) => (
          <OptionCard key={o.id} selected={answer === o.id} onClick={() => onAnswer(o.id)}>
            <div className="aspect-video overflow-hidden rounded-xl">
              <Illus id={o.id} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="font-mono text-xs text-faint">{LETTERS[i]}</span>
              {t(o.label)}
            </div>
          </OptionCard>
        ))}
      </div>
    );
  }

  if (q.kind === "hotspot") {
    const labels = Object.fromEntries(q.options.map((o) => [o.id, t(o.label)]));
    return (
      <div>
        <FloorPlan selected={answer as string | undefined} onSelect={onAnswer} labels={{ ...labels, title: t("Floor plan") }} />
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-faint">
          <span>
            <b className="font-mono text-text">D</b> = {t("detective")}
          </span>
          <span>
            <b className="font-mono text-amber">S</b> = {t("suspect")}
          </span>
        </div>
        <p className="mt-2 min-h-5 text-center text-sm text-accent-strong" aria-live="polite">
          {answer ? labels[answer as string] : ""}
        </p>
      </div>
    );
  }

  if (q.kind === "sequence") {
    const shots: Array<{ who: "A" | "B"; facing: "left" | "right" }> = [
      { who: "A", facing: "right" },
      { who: "B", facing: "left" },
      { who: "A", facing: "left" },
    ];
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup">
        {q.options.map((o, i) => (
          <OptionCard key={o.id} selected={answer === o.id} onClick={() => onAnswer(o.id)} className="p-2 sm:p-3">
            <div className="aspect-video overflow-hidden rounded-lg">
              <ShotPanel {...shots[i]} />
            </div>
            <div className="mt-2 text-center font-mono text-xs text-faint">{t(o.label)}</div>
          </OptionCard>
        ))}
      </div>
    );
  }

  if (q.kind === "order") return <OrderBody q={q} answer={answer as string[] | undefined} onAnswer={onAnswer} />;
  if (q.kind === "match") return <MatchBody q={q} answer={answer as string[] | undefined} onAnswer={onAnswer} />;

  // choice
  return (
    <div className="grid gap-2.5" role="radiogroup">
      {q.options.map((o, i) => (
        <OptionCard key={o.id} selected={answer === o.id} onClick={() => onAnswer(o.id)} className="flex items-center gap-4 p-4 pr-12">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm",
              answer === o.id ? "bg-accent text-white" : "bg-surface-2 text-faint",
            )}
          >
            {LETTERS[i]}
          </span>
          <span className="text-[15px] leading-snug">{t(o.label)}</span>
        </OptionCard>
      ))}
    </div>
  );
}

function OrderBody({ q, answer, onAnswer }: { q: Extract<Question, { kind: "order" }>; answer?: string[]; onAnswer: (a: string[]) => void }) {
  const t = useT();
  const shuffled = useMemo(() => shuffle(q.items, q.id), [q]);
  const order = answer ?? [];
  return (
    <div>
      <div className="grid gap-2.5">
        {shuffled.map((item) => {
          const pos = order.indexOf(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAnswer(pos >= 0 ? order.filter((x) => x !== item.id) : [...order, item.id])}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-4 text-left text-[15px] transition-all duration-200",
                pos >= 0 ? "border-accent bg-accent-soft" : "border-line-soft bg-ink/40 hover:-translate-y-0.5 hover:border-line",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-sm transition-colors",
                  pos >= 0 ? "bg-accent text-white" : "border border-dashed border-line text-faint",
                )}
              >
                {pos >= 0 ? pos + 1 : "·"}
              </span>
              {t(item.label)}
            </button>
          );
        })}
      </div>
      {order.length > 0 && (
        <button type="button" onClick={() => onAnswer([])} className="mt-3 inline-flex items-center gap-1.5 text-sm text-faint hover:text-text">
          <RotateCcw className="size-3.5" aria-hidden /> {t("Reset order")}
        </button>
      )}
    </div>
  );
}

function MatchBody({ q, answer, onAnswer }: { q: Extract<Question, { kind: "match" }>; answer?: string[]; onAnswer: (a: string[]) => void }) {
  const t = useT();
  const rights = useMemo(() => shuffle(q.pairs, q.id + "r"), [q]);
  const [active, setActive] = useState<string | null>(null);
  const pairs = answer ?? [];
  const leftOf = (r: string) => pairs.find((p) => p.split(":")[1] === r)?.split(":")[0];
  const rightOf = (l: string) => pairs.find((p) => p.split(":")[0] === l)?.split(":")[1];
  const colorOf = (l: string) => PAIR_COLORS[q.pairs.findIndex((p) => p.id === l) % PAIR_COLORS.length];

  const pickRight = (r: string) => {
    if (!active) return;
    const next = pairs.filter((p) => !p.startsWith(`${active}:`) && p.split(":")[1] !== r);
    onAnswer([...next, `${active}:${r}`]);
    setActive(null);
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6">
      <div className="grid gap-2.5">
        {q.pairs.map((p) => {
          const matched = rightOf(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active === p.id}
              onClick={() => setActive(active === p.id ? null : p.id)}
              className={cn(
                "rounded-2xl border p-3 text-left text-sm font-medium transition-all sm:p-4",
                active === p.id ? "border-accent bg-accent-soft" : "border-line-soft bg-ink/40 hover:border-line",
              )}
              style={matched ? { borderColor: colorOf(p.id), boxShadow: `inset 4px 0 0 ${colorOf(p.id)}` } : undefined}
            >
              {t(p.left)}
            </button>
          );
        })}
      </div>
      <div className="grid gap-2.5">
        {rights.map((p) => {
          const l = leftOf(p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={!active}
              onClick={() => pickRight(p.id)}
              className={cn(
                "rounded-2xl border p-3 text-left text-sm transition-all sm:p-4",
                active ? "border-line hover:border-accent hover:bg-accent-soft" : "border-line-soft bg-ink/40",
                !active && !l && "text-muted",
              )}
              style={l ? { borderColor: colorOf(l), boxShadow: `inset -4px 0 0 ${colorOf(l)}` } : undefined}
            >
              {t(p.right)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Results({ result, skills, onRetry }: { result: QuizOutcome; skills: Record<string, SkillInfo>; onRetry: () => void }) {
  const t = useT();
  const reduce = useReducedMotion();
  if ("error" in result) {
    return (
      <div className="py-6 text-center">
        <p className="text-danger" role="alert">
          {t(result.error)}
        </p>
        <Button className="mt-4" onClick={onRetry}>
          {t("Try again")}
        </Button>
      </div>
    );
  }
  const entries = Object.entries(result.levels)
    .filter(([id]) => skills[id])
    .sort((a, b) => skills[a[0]].category.localeCompare(skills[b[0]].category));
  return (
    <div>
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-soft text-amber">
          <Sparkles className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 font-display text-[2.1rem]">{t("Your starting map is ready")}</h1>
        <p className="mx-auto mt-2 max-w-lg text-muted">
          {entries.length
            ? t("{n} skills now have a provisional starting level. They're marked as self-reported until projects and feedback back them up.", { n: entries.length })
            : t("No starting levels yet — that's fine. Your first project will start filling the map.")}
        </p>
      </div>
      {entries.length > 0 && (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {entries.map(([id, level], i) => (
            <motion.li
              key={id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.25 }}
              className="flex items-center gap-3 rounded-xl border border-line-soft bg-ink/40 px-3 py-2.5"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: skills[id].color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{skills[id].name}</div>
                <div className="truncate text-[11px] text-faint">{skills[id].category}</div>
              </div>
              <div className="flex gap-1" aria-label={t("Level {n} of 5", { n: level })}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={cn("h-2 w-4 rounded-full", n <= (level as Level) ? "bg-accent" : "bg-surface-3")} />
                ))}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
      {result.kept.length > 0 && (
        <p className="mt-4 text-center text-xs text-faint">{t("{n} skills you had already assessed yourself were left unchanged.", { n: result.kept.length })}</p>
      )}
      <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href="/skills" className={buttonClass("primary", "lg")}>
          {t("Open my skill tree")}
        </Link>
        <Link href="/dashboard" className={buttonClass("secondary", "lg")}>
          {t("Go to my dashboard")}
        </Link>
      </div>
    </div>
  );
}
