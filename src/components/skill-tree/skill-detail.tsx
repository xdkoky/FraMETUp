"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, Clock, Crosshair, Info, Timer } from "lucide-react";
import { CONFIDENCE_LABEL, SOURCE_LABEL } from "@/lib/assessment/engine";
import { STATE_STYLE } from "@/lib/skill-state";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { Meter } from "@/components/ui/misc";
import { logDrill } from "@/app/(app)/skills/actions";
import type { DrillPractice, SkillExtras, SkillStatus, TreeCategory, TreeSkill } from "./types";
import { useFormat, useT } from "@/i18n/client";

export interface LinkedSkill {
  id: string;
  name: string;
  state: SkillStatus["state"];
}

interface Props {
  skill: TreeSkill;
  category: TreeCategory;
  status: SkillStatus;
  prerequisites: LinkedSkill[];
  enables: LinkedSkill[];
  related: LinkedSkill[];
  extras: SkillExtras;
  practice?: DrillPractice;
  isGoal: boolean;
  onNavigate?: (id: string) => void;
  compact?: boolean;
}

type Tab = "practise" | "level" | "evidence" | "connections";

/** Nearest rubric level for an estimate (for highlighting only — never shown as a grade). */
function nearestLevel(mastery: number | null) {
  if (mastery === null) return null;
  return Math.min(5, Math.max(1, Math.round((mastery - 10) / 20) + 1));
}

function SkillChip({ s, onNavigate }: { s: LinkedSkill; onNavigate?: (id: string) => void }) {
  const t = useT();
  const st = STATE_STYLE[s.state];
  const inner = (
    <>
      <span
        className={cn("size-2 rounded-full", s.state === "NOT_ASSESSED" && "border border-dashed bg-transparent")}
        style={s.state === "NOT_ASSESSED" ? { borderColor: st.color } : { background: st.color }}
        aria-hidden
      />
      {s.name}
    </>
  );
  const cls = "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-2.5 py-1 text-xs text-muted hover:text-text hover:border-faint transition-colors";
  return onNavigate ? (
    <button type="button" className={cls} onClick={() => onNavigate(s.id)} title={t(st.label)}>
      {inner}
    </button>
  ) : (
    <Link className={cls} href={`/skills/${s.id}`} title={t(st.label)}>
      {inner}
    </Link>
  );
}

function LevelBar({ steps, color, confidence }: { steps: number; color: string; confidence: number }) {
  return (
    <div className="flex w-24 gap-1" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="h-1.5 flex-1 rounded-full"
          style={{ background: n <= steps ? color : "var(--color-surface-3)", opacity: n <= steps ? 0.45 + 0.55 * confidence : 1 }}
        />
      ))}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs text-faint">{children}</div>;
}

export function SkillDetail({ skill, category, status, prerequisites, enables, related, extras, practice = {}, isGoal, onNavigate, compact }: Props) {
  const t = useT();
  const fmt = useFormat();
  const st = STATE_STYLE[status.state];
  const assessed = status.mastery !== null;
  const level = nearestLevel(status.mastery);

  // Optimistic practice log so the button responds instantly.
  const [logged, setLogged] = useState<DrillPractice>({});
  const [pending, startTransition] = useTransition();
  const drillState = (id: string) => logged[id] ?? practice[id] ?? { count: 0, today: false };

  const subs = skill.subskills;
  const next = [...subs].filter((s) => !drillState(s.id).today).sort((a, b) => drillState(a.id).count - drillState(b.id).count)[0] ?? null;

  const [tab, setTab] = useState<Tab>("practise");
  const [openSub, setOpenSub] = useState<string | null>(next?.id ?? subs[0]?.id ?? null);
  const connectionCount = prerequisites.length + enables.length + related.length;

  const practise = (id: string) => {
    const cur = drillState(id);
    if (cur.today) return;
    setLogged((m) => ({ ...m, [id]: { count: cur.count + 1, today: true } }));
    startTransition(async () => {
      const res = await logDrill(id);
      if (!res.ok) setLogged((m) => ({ ...m, [id]: cur }));
    });
  };

  const tabs: { id: Tab; label: string; badge?: React.ReactNode }[] = [
    { id: "practise", label: t("Practise") },
    { id: "level", label: t("Level") },
    {
      id: "evidence",
      label: t("Evidence"),
      badge: status.discrepancy ? <span className="size-1.5 rounded-full bg-amber" aria-label={t("Needs attention")} /> : null,
    },
    { id: "connections", label: t("Connections"), badge: connectionCount ? <span className="font-mono text-[10px] text-faint">{connectionCount}</span> : null },
  ];

  return (
    <div className="text-sm">
      {/* ── At a glance ─────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono" style={{ color: category.color }}>
          {category.code}
        </span>
        <span className="text-faint">{category.name}</span>
      </div>
      <h2 className={cn("mt-1 pr-8 font-display leading-tight", compact ? "text-[1.75rem]" : "text-[2.1rem]")}>{skill.name}</h2>
      <p className="mt-1.5 text-muted leading-relaxed">{skill.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line-soft bg-ink/40 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 font-medium" style={{ color: assessed ? st.color : undefined }}>
          <span
            className="size-2.5 rounded-full"
            style={assessed ? { background: st.color } : { border: `1.5px dashed ${st.color}` }}
            aria-hidden
          />
          {t(st.label)}
        </span>
        <LevelBar steps={level ?? 0} color={st.color} confidence={status.confidence} />
        <span className="text-xs text-faint">
          {t("Confidence: {c}", { c: t(CONFIDENCE_LABEL[status.confidenceBand]).toLowerCase() })}
        </span>
        {(isGoal || status.needsReassessment || (status.selfReportedOnly && assessed)) && (
          <span className="flex basis-full flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-faint sm:basis-auto">
            {isGoal && (
              <span className="inline-flex items-center gap-1 text-accent">
                <Crosshair className="size-3" aria-hidden /> {t("Learning goal")}
              </span>
            )}
            {status.needsReassessment && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden /> {t("Could use fresh evidence")}
              </span>
            )}
            {status.selfReportedOnly && assessed && <span>{t("Self-reported only")}</span>}
          </span>
        )}
      </div>

      {next ? (
        <button
          type="button"
          onClick={() => {
            setTab("practise");
            setOpenSub(next.id);
          }}
          className="group mt-2.5 flex w-full items-center gap-2 rounded-xl border border-accent/25 bg-accent-soft px-3 py-2.5 text-left text-[13px] transition-colors hover:border-accent/50"
        >
          <span className="slate-label !text-accent shrink-0">{t("Next step")}</span>
          <span className="min-w-0 flex-1 truncate text-text">{next.name}</span>
          <span className="shrink-0 text-xs text-faint">{t("{n} min", { n: next.minutes })}</span>
          <ArrowRight className="size-3.5 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>
      ) : (
        subs.length > 0 && (
          <p className="mt-2.5 flex items-center gap-2 rounded-xl border border-line-soft px-3 py-2.5 text-[13px] text-muted">
            <Check className="size-4 text-accent" aria-hidden /> {t("All drills done today. Self-assess or ask for feedback to update your level.")}
          </p>
        )
      )}

      {/* ── Tabs ─────────────────────────────────────── */}
      <div role="tablist" aria-label={t("Skill details")} className="mt-5 flex gap-1 overflow-x-auto border-b border-line-soft">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            id={`tab-${tb.id}`}
            aria-selected={tab === tb.id}
            aria-controls={`panel-${tb.id}`}
            onClick={() => setTab(tb.id)}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-[13px] transition-colors",
              tab === tb.id ? "border-accent text-text" : "border-transparent text-muted hover:text-text",
            )}
          >
            {tb.label}
            {tb.badge}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="py-4">
        {tab === "practise" && (
          <div>
            <ol className="space-y-2">
              {subs.map((s, i) => {
                const d = drillState(s.id);
                const open = openSub === s.id;
                return (
                  <li key={s.id} className={cn("rounded-xl border transition-colors", open ? "border-line bg-surface-2/40" : "border-line-soft")}>
                    <button
                      type="button"
                      onClick={() => setOpenSub(open ? null : s.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[11px]",
                          d.today ? "border-accent bg-accent text-white" : "border-line text-faint",
                        )}
                        aria-hidden
                      >
                        {d.today ? <Check className="size-3.5" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] font-medium text-text">{s.name}</span>
                      {d.count > 0 && <span className="shrink-0 font-mono text-[11px] text-faint">×{d.count}</span>}
                      <ChevronDown className={cn("size-4 shrink-0 text-faint transition-transform", open && "rotate-180")} aria-hidden />
                    </button>
                    {open && (
                      <div className="px-3 pb-3 pl-12">
                        <p className="text-[13px] leading-relaxed text-muted">{s.what}</p>
                        <div className="mt-2.5 rounded-lg border border-line-soft bg-ink/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="slate-label">{t("Drill")}</span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-faint">
                              <Timer className="size-3" aria-hidden /> {t("{n} min", { n: s.minutes })}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-text">{s.drill}</p>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <button
                            type="button"
                            onClick={() => practise(s.id)}
                            disabled={d.today || pending}
                            className={buttonClass(d.today ? "ghost" : "secondary", "sm")}
                          >
                            {d.today ? (
                              <>
                                <Check className="size-3.5" aria-hidden /> {t("Practised today")}
                              </>
                            ) : (
                              t("I practised this")
                            )}
                          </button>
                          <span className="text-[11.5px] text-faint">
                            {d.count ? t("Logged {n} times", { n: d.count }) : t("Not practised yet")}
                          </span>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 flex gap-1.5 text-[11.5px] leading-relaxed text-faint">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              {t("Practice earns XP. Your level only moves with evidence: projects, self-assessment and feedback.")}
            </p>

            {skill.lessons.length > 0 && (
              <div className="mt-5">
                <Label>{t("Learn the theory")}</Label>
                <div className="grid gap-1.5">
                  {skill.lessons.map((l) => (
                    <Link
                      key={l.id}
                      href={`/lesson/${l.id}`}
                      className="press flex items-center gap-2.5 rounded-xl border-2 border-line px-3 py-2 text-[13px] font-bold text-text shadow-[0_3px_0_var(--color-line)] hover:bg-surface-2"
                    >
                      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", l.done ? "bg-success-bright text-white" : "bg-accent-soft text-accent")}>
                        {l.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <BookOpen className="size-3.5" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-faint" aria-hidden />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(skill.exercises.length > 0 || extras.challenges.length > 0) && (
              <div className="mt-5">
                <Label>{t("Bigger exercises")}</Label>
                {skill.exercises.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-[13px] text-muted">
                    {skill.exercises.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
                {extras.challenges.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {extras.challenges.map((c) => (
                      <Link
                        key={c.id}
                        href={`/challenges#${c.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber-soft px-2.5 py-1 text-xs text-amber hover:brightness-110"
                      >
                        {c.title} <ArrowUpRight className="size-3" aria-hidden />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "level" && (
          <div>
            <ol className="space-y-1.5">
              {skill.levels.map((l, i) => {
                const here = level === i + 1;
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex gap-3 rounded-lg border px-3 py-2 text-[13px] leading-snug",
                      here ? "border-accent/40 bg-accent-soft text-text" : "border-transparent text-muted",
                    )}
                  >
                    <span className="mt-0.5 font-mono text-xs text-faint">L{i + 1}</span>
                    <span className="flex-1">{l}</span>
                    {here && <span className="slate-label shrink-0 !text-accent">{t("You're here")}</span>}
                  </li>
                );
              })}
            </ol>
            {!assessed && <p className="mt-2 text-xs text-faint">{t("Not assessed yet. Self-assess to see where you stand.")}</p>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("Observable outcomes")}</Label>
                <ul className="list-disc space-y-0.5 pl-4 text-[12.5px] text-muted">
                  {skill.outcomes.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
              <div>
                <Label>{t("Assessment criteria")}</Label>
                <ul className="list-disc space-y-0.5 pl-4 text-[12.5px] text-muted">
                  {skill.criteria.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === "evidence" && (
          <div className="space-y-5">
            {status.discrepancy && (
              <div className="flex gap-2 rounded-lg border border-amber/25 bg-amber-soft p-3 text-xs text-amber">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                <p>
                  {status.discrepancy.direction === "self-higher"
                    ? t("You rate yourself higher than peers observed. Worth a conversation — ask for concrete examples.")
                    : t("Peers observed this more strongly than you rated yourself. You might be underestimating it.")}
                </p>
              </div>
            )}

            {assessed && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("Estimated proficiency")}</Label>
                  <Meter value={status.mastery as number} color={st.color} label={t("Estimated proficiency")} />
                </div>
                <div>
                  <Label>{t("Evidence confidence")}</Label>
                  <Meter value={status.confidence * 100} color="var(--color-faint)" label={t("Evidence confidence")} />
                </div>
              </div>
            )}

            <div>
              <Label>{t("How this was estimated")}</Label>
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-muted">
                {status.explanation.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              {status.breakdown.map((b) => (
                <div key={b.source} className={cn("rounded-lg border px-3 py-2", b.present ? "border-line-soft bg-surface-2/40" : "border-dashed border-line-soft")}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={b.present ? "text-text" : "text-faint"}>{t(SOURCE_LABEL[b.source])}</span>
                    <span className="font-mono text-faint">
                      {b.present ? t("weight {n}%", { n: Math.round(b.effectiveWeight * 100) }) : t("missing · base {n}%", { n: Math.round(b.baseWeight * 100) })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-faint">{b.note}</p>
                </div>
              ))}
            </div>
            {status.lastEvidenceAt && (
              <p className="text-xs text-faint">
                {t("Most recent evidence:")} {fmt.date(status.lastEvidenceAt)}
              </p>
            )}

            <div>
              <Label>{t("Linked projects")}</Label>
              {extras.projects.length ? (
                <ul className="space-y-1.5">
                  {extras.projects.map((p) => (
                    <li key={p.id}>
                      <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-line-soft px-3 py-2 hover:border-line">
                        <span className="truncate text-[13px] text-text">{p.title}</span>
                        <span className="shrink-0 text-[11px] text-faint">{p.level ? t("mapped to level {n}", { n: p.level }) : t("practice")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-faint">{t("No projects linked to this skill yet.")}</p>
              )}
              <p className="mt-2 text-xs text-faint">
                {t("Useful evidence:")} {skill.evidenceTypes.join(", ")}.
              </p>
            </div>
          </div>
        )}

        {tab === "connections" && (
          <div className="space-y-4">
            <div>
              <Label>{t("Builds on")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {prerequisites.length ? prerequisites.map((s) => <SkillChip key={s.id} s={s} onNavigate={onNavigate} />) : <span className="text-xs text-faint">{t("A foundational skill.")}</span>}
              </div>
            </div>
            {enables.length > 0 && (
              <div>
                <Label>{t("Supports")}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {enables.map((s) => (
                    <SkillChip key={s.id} s={s} onNavigate={onNavigate} />
                  ))}
                </div>
              </div>
            )}
            {related.length > 0 && (
              <div>
                <Label>{t("Related")}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {related.map((s) => (
                    <SkillChip key={s.id} s={s} onNavigate={onNavigate} />
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11.5px] text-faint">{t("Connections guide learning. Nothing is locked — you can practise any skill at any time.")}</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 flex flex-wrap gap-2 border-t border-line-soft bg-surface/95 px-5 py-3 backdrop-blur">
        <Link href={`/assess/${skill.id}`} className={buttonClass("primary", "sm")}>
          {t("Self-assess")}
        </Link>
        <Link href={`/feedback/request?skill=${skill.id}`} className={buttonClass("secondary", "sm")}>
          {t("Request feedback")}
        </Link>
        <Link href={`/projects?link=${skill.id}`} className={buttonClass("ghost", "sm")}>
          {t("Link a project")}
        </Link>
      </div>
    </div>
  );
}
