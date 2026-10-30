"use client";

import { useActionState, useState } from "react";
import { FieldError, FormMessage, Hint, Label, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { submitSelfAssessment, type AssessState } from "../actions";

export function AssessForm({
  skillId,
  levels,
  projects,
  next,
  current,
}: {
  skillId: string;
  levels: string[];
  projects: { id: string; title: string }[];
  next?: string;
  current?: number;
}) {
  const [state, action] = useActionState<AssessState, FormData>(submitSelfAssessment, null);
  const [level, setLevel] = useState<number | null>(null);
  const needsSupport = (level ?? 0) >= 4;
  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <input type="hidden" name="skillId" value={skillId} />
      <input type="hidden" name="next" value={next ?? ""} />
      <fieldset>
        <legend className="text-sm font-medium">Which statement best describes you today?</legend>
        <Hint className="mt-1 mb-3">Choose based on what you have actually done, not what you could probably do.{current ? ` Last time you chose level ${current}.` : ""}</Hint>
        <div className="space-y-2" role="radiogroup">
          {levels.map((l, i) => (
            <label
              key={i}
              className={cn(
                "flex cursor-pointer gap-4 rounded-xl border px-4 py-3 text-sm leading-snug transition-colors",
                level === i + 1 ? "border-accent bg-accent-soft text-text" : "border-line-soft text-muted hover:border-line",
              )}
            >
              <input type="radio" name="level" value={i + 1} className="sr-only" onChange={() => setLevel(i + 1)} required />
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs", level === i + 1 ? "border-accent text-accent" : "border-line text-faint")}>{i + 1}</span>
              <span className="pt-1">{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="exampleProjectId">Example project {needsSupport && <span className="text-amber">(or a reflection below)</span>}</Label>
        <Select id="exampleProjectId" name="exampleProjectId" defaultValue="">
          <option value="">None</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="reflection">Why this level? {needsSupport ? <span className="text-amber">(required for levels 4–5 without an example)</span> : "(optional)"}</Label>
        <Textarea id="reflection" name="reflection" rows={3} maxLength={3000} placeholder="Describe a specific moment that shows it." />
        <FieldError errors={state?.fieldErrors?.reflection} />
        <Hint>Higher claims need evidence: unsupported level 4–5 ratings are counted as level 3.</Hint>
      </div>
      <div className="flex justify-end">
        <SubmitButton disabled={!level} pendingText="Saving…">
          Save assessment
        </SubmitButton>
      </div>
    </form>
  );
}
