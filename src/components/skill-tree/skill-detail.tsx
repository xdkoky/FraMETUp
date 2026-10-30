"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowUpRight, ChevronDown, Clock, Crosshair, Info } from "lucide-react";
import { CONFIDENCE_LABEL, SOURCE_LABEL } from "@/lib/assessment/engine";
import { STATE_STYLE } from "@/lib/skill-state";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { Badge, Meter } from "@/components/ui/misc";
import type { SkillExtras, SkillStatus, TreeCategory, TreeSkill } from "./types";
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
  isGoal: boolean;
  onNavigate?: (id: string) => void;
  compact?: boolean;
}

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

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-line-soft py-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <h3 className="slate-label !text-muted">{title}</h3>
        <ChevronDown className={cn("size-4 text-faint transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

export function SkillDetail({ skill, category, status, prerequisites, enables, related, extras, isGoal, onNavigate, compact }: Props) {
  const t = useT();
  const fmt = useFormat();
  const st = STATE_STYLE[status.state];
  const assessed = status.mastery !== null;
  const level = nearestLevel(status.mastery);

  return (
    <div className="text-sm">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-mono" style={{ color: category.color }}>
          {category.code}
        </span>
        <span className="text-faint">{category.name}</span>
      </div>
      <h2 className={cn("mt-1 font-display leading-tight", compact ? "text-3xl" : "text-4xl")}>{skill.name}</h2>
      <p className="mt-2 text-muted leading-relaxed">{skill.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge style={{ color: st.color, borderColor: `${st.color}55`, background: `${st.color}14` }}>{t(st.label)}</Badge>
        {isGoal && (
          <Badge tone="accent">
            <Crosshair className="size-3" aria-hidden />{" "}{t("Learning goal")}
          </Badge>
        )}
        {status.needsReassessment && (
          <Badge tone="neutral">
            <Clock className="size-3" aria-hidden />{" "}{t("Could use fresh evidence")}
          </Badge>
        )}
        {status.selfReportedOnly && assessed && <Badge tone="outline">{t("Self-reported only")}</Badge>}
      </div>

      {/* Estimate & confidence — always shown together */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line-soft bg-ink/40 p-3">
          <div className="slate-label">{t("Estimated proficiency")}</div>
          <div className="mt-1 text-[15px] font-semibold" style={{ color: assessed ? st.color : undefined }}>
            {assessed ? t(STATE_STYLE[status.state === "STRONGLY_EVIDENCED" ? "ADVANCED" : status.state].label) : "—"}
          </div>
          {assessed && <Meter className="mt-2" value={status.mastery as number} color={st.color} label={t("Estimated proficiency")} />}
        </div>
        <div className="rounded-xl border border-line-soft bg-ink/40 p-3">
          <div className="slate-label">{t("Evidence confidence")}</div>
          <div className="mt-1 text-[15px] font-semibold">{t(CONFIDENCE_LABEL[status.confidenceBand])}</div>
          {assessed && <Meter className="mt-2" value={status.confidence * 100} color="#9BA4B5" label={t("Evidence confidence")} />}
        </div>
      </div>

      {status.discrepancy && (
        <div className="mt-3 flex gap-2 rounded-lg border border-amber/25 bg-amber-soft p-3 text-xs text-amber">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <p>
            {status.discrepancy.direction === "self-higher"
              ? t("You rate yourself higher than peers observed. Worth a conversation — ask for concrete examples.")
              : t("Peers observed this more strongly than you rated yourself. You might be underestimating it.")}
          </p>
        </div>
      )}

      <Section title={t("How this was estimated")}>
        <ul className="space-y-1.5 text-[13px] text-muted leading-relaxed">
          {status.explanation.map((line, i) => (
            <li key={i} className="flex gap-2">
              <Info className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
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
        {status.lastEvidenceAt && <p className="mt-3 text-xs text-faint">{t("Most recent evidence:")}{" "}{fmt.date(status.lastEvidenceAt)}</p>}
      </Section>

      <Section title={t("Connections")}>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-faint mb-1.5">{t("Builds on")}</div>
            <div className="flex flex-wrap gap-1.5">
              {prerequisites.length ? prerequisites.map((s) => <SkillChip key={s.id} s={s} onNavigate={onNavigate} />) : <span className="text-xs text-faint">{t("A foundational skill.")}</span>}
            </div>
          </div>
          {enables.length > 0 && (
            <div>
              <div className="text-xs text-faint mb-1.5">{t("Supports")}</div>
              <div className="flex flex-wrap gap-1.5">
                {enables.map((s) => <SkillChip key={s.id} s={s} onNavigate={onNavigate} />)}
              </div>
            </div>
          )}
          {related.length > 0 && (
            <div>
              <div className="text-xs text-faint mb-1.5">{t("Related")}</div>
              <div className="flex flex-wrap gap-1.5">
                {related.map((s) => <SkillChip key={s.id} s={s} onNavigate={onNavigate} />)}
              </div>
            </div>
          )}
          <p className="text-[11.5px] text-faint">{t("Connections guide learning. Nothing is locked — you can practise any skill at any time.")}</p>
        </div>
      </Section>

      <Section title={t("Evidence")}>
        {extras.projects.length ? (
          <ul className="space-y-1.5">
            {extras.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-line-soft px-3 py-2 hover:border-line">
                  <span className="text-[13px] text-text truncate">{p.title}</span>
                  <span className="text-[11px] text-faint shrink-0">{p.level ? t("mapped to level {n}", { n: p.level }) : t("practice")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-faint">{t("No projects linked to this skill yet.")}</p>
        )}
        <p className="mt-3 text-xs text-faint">{t("Useful evidence:")}{" "}{skill.evidenceTypes.join(", ")}.</p>
      </Section>

      <Section title={t("Rubric")} defaultOpen={!compact}>
        <ol className="space-y-1.5">
          {skill.levels.map((l, i) => (
            <li
              key={i}
              className={cn(
                "flex gap-3 rounded-lg px-3 py-2 text-[13px] leading-snug",
                level === i + 1 ? "bg-accent-soft text-text" : "text-muted",
              )}
            >
              <span className="font-mono text-xs text-faint mt-0.5">L{i + 1}</span>
              <span>{l}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-faint mb-1">{t("Observable outcomes")}</div>
            <ul className="list-disc pl-4 text-[12.5px] text-muted space-y-0.5">
              {skill.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs text-faint mb-1">{t("Assessment criteria")}</div>
            <ul className="list-disc pl-4 text-[12.5px] text-muted space-y-0.5">
              {skill.criteria.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title={t("Practise it")} defaultOpen={!compact}>
        <ul className="space-y-1 text-[13px] text-muted list-disc pl-4">
          {skill.exercises.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        {extras.challenges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {extras.challenges.map((c) => (
              <Link key={c.id} href={`/challenges#${c.id}`} className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber-soft px-2.5 py-1 text-xs text-amber hover:brightness-110">
                {c.title} <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </Section>

      <div className="sticky bottom-0 -mx-5 mt-2 flex flex-wrap gap-2 border-t border-line-soft bg-surface/95 px-5 py-3 backdrop-blur">
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
