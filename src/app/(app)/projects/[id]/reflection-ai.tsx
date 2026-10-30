"use client";

import { useState, useTransition } from "react";
import { Check, HelpCircle, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { analyzeReflection, decideSuggestion, type AnalysisResult } from "../../ai/actions";
import { useT } from "@/i18n/client";

export interface StoredSuggestion {
  id: string;
  skillId: string;
  skillName: string;
  rationale: string;
  evidenceQuote: string | null;
  suggestedLevel: number | null;
  confidence: number;
  status: "SUGGESTED" | "ACCEPTED" | "DISMISSED";
}

export interface StoredAnalysis {
  provider: string;
  model: string | null;
  createdAt: string;
  summary: string;
  questions: string[];
  missingEvidence: string[];
  exercises: string[];
  suggestions: StoredSuggestion[];
}

function providerLabel(p: string) {
  return p === "anthropic" ? "AI suggestion (Claude)" : "Local heuristic — not AI"; // translated at use site
}

export function ReflectionAI({ reflectionId, latest, skillNames }: { reflectionId: string; latest: StoredAnalysis | null; skillNames: Record<string, string> }) {
  const t = useT();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "ACCEPTED" | "DISMISSED">>({});

  const fresh = result && "ok" in result ? result : null;
  const view: StoredAnalysis | null = fresh
    ? {
        provider: fresh.provider,
        model: null,
        createdAt: new Date().toISOString(),
        summary: fresh.analysis.summary,
        questions: fresh.analysis.questions,
        missingEvidence: fresh.analysis.missingEvidence,
        exercises: fresh.analysis.exercises,
        suggestions: fresh.suggestions.map((s) => ({ ...s, skillName: skillNames[s.skillId] ?? s.skillId, status: "SUGGESTED" as const })),
      }
    : latest;
  const suggestions = view?.suggestions ?? [];

  return (
    <div className="mt-4 rounded-xl border border-line-soft bg-ink/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-accent" aria-hidden />{" "}{t("Reflection assistant")}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => start(async () => setResult(await analyzeReflection(reflectionId)))}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
          {latest || result ? t("Analyse again") : t("Organise this reflection")}
        </Button>
      </div>
      <p className="mt-1 text-[11.5px] text-faint">
        {t("Suggestions only. It reads your text — never footage — and nothing counts toward your skills unless you accept it.")}
      </p>

      {result && "error" in result && <p className="mt-3 text-sm text-danger" role="alert">{t(result.error)}</p>}
      {result && "ok" in result && result.note && <p className="mt-3 text-xs text-amber">{t(result.note)}</p>}

      {view && (
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge tone={view.provider === "anthropic" ? "accent" : "outline"}>{t(providerLabel(view.provider))}</Badge>
          </div>
          <p className="text-muted leading-relaxed">{view.summary}</p>

          {suggestions.length > 0 && (
            <div>
              <div className="slate-label mb-2">{t("Possible skill evidence")}</div>
              <ul className="space-y-2">
                {suggestions.map((s) => {
                  const status = (decisions[s.id] ?? s.status) as StoredSuggestion["status"];
                  return (
                    <li key={s.id} className="rounded-lg border border-line-soft p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-text">{s.skillName}</span>
                        {s.suggestedLevel && <Badge>{t("suggests L")}{s.suggestedLevel}</Badge>}
                        <span className="text-[11px] text-faint">{t("uncertainty:")}{" "}{s.confidence < 0.35 ? "high" : s.confidence < 0.65 ? "moderate" : "lower"}</span>
                        {status !== "SUGGESTED" && <Badge tone={status === "ACCEPTED" ? "success" : "neutral"}>{status === "ACCEPTED" ? t("Accepted") : t("Dismissed")}</Badge>}
                      </div>
                      <p className="mt-1 text-[12.5px] text-muted">{s.rationale}</p>
                      {s.evidenceQuote && <blockquote className="mt-1.5 border-l-2 border-line pl-2 text-[12px] italic text-faint">“{s.evidenceQuote}”</blockquote>}
                      {status === "SUGGESTED" && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => start(async () => {
                              await decideSuggestion(s.id, "ACCEPTED");
                              setDecisions((d) => ({ ...d, [s.id]: "ACCEPTED" }));
                            })}
                          >
                            <Check className="size-3.5" aria-hidden />{" "}{t("Accept")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => start(async () => {
                              await decideSuggestion(s.id, "DISMISSED");
                              setDecisions((d) => ({ ...d, [s.id]: "DISMISSED" }));
                            })}
                          >
                            <X className="size-3.5" aria-hidden />{" "}{t("Dismiss")}
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {view.missingEvidence.length > 0 && (
            <div>
              <div className="slate-label mb-1.5">{t("Missing evidence")}</div>
              <ul className="list-disc pl-4 text-[13px] text-muted space-y-0.5">
                {view.missingEvidence.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
          )}
          {view.questions.length > 0 && (
            <div>
              <div className="slate-label mb-1.5">{t("Questions to think about")}</div>
              <ul className="space-y-1 text-[13px] text-muted">
                {view.questions.map((q) => (
                  <li key={q} className="flex gap-2"><HelpCircle className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden />{q}</li>
                ))}
              </ul>
            </div>
          )}
          {view.exercises.length > 0 && (
            <div>
              <div className="slate-label mb-1.5">{t("Small exercises")}</div>
              <ul className="list-disc pl-4 text-[13px] text-muted space-y-0.5">
                {view.exercises.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
