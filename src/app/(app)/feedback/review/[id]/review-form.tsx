"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormMessage, Label, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { OBSERVATION_LABEL } from "@/lib/utils";
import type { FeedbackState } from "../../actions";
import { useT } from "@/i18n/client";

const OPTIONS = Object.entries(OBSERVATION_LABEL);

export function ReviewForm({
  action,
  decline,
  skills,
}: {
  action: (s: FeedbackState, f: FormData) => Promise<FeedbackState>;
  decline: () => Promise<void>;
  skills: { id: string; name: string; description: string; levels: string[] }[];
}) {
  const t = useT();
  const [state, formAction] = useActionState(action, null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />
      <Card className="p-5">
        <Label htmlFor="familiarity">{t("How closely did you work together on this?")}</Label>
        <Select id="familiarity" name="familiarity" defaultValue="WORKED_ALONGSIDE">
          <option value="BRIEF">{t("I mainly saw the result")}</option>
          <option value="WORKED_ALONGSIDE">{t("I worked alongside them")}</option>
          <option value="CLOSE_COLLABORATOR">{t("Close collaborator throughout")}</option>
        </Select>
      </Card>
      {skills.map((s, idx) => (
        <Card key={s.id} className="p-5">
          <fieldset>
            <legend className="text-[15px] font-semibold">
              <span className="font-mono text-xs text-faint mr-2">{idx + 1}</span>
              {s.name}
            </legend>
            <p className="mt-1 text-sm text-muted">{s.description}</p>
            <details className="mt-2 text-xs text-faint">
              <summary className="cursor-pointer">{t("What the levels look like")}</summary>
              <ol className="mt-2 space-y-1 pl-4 list-decimal">
                {s.levels.map((l) => <li key={l}>{l}</li>)}
              </ol>
            </details>
            <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {OPTIONS.map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line-soft px-3 py-2 text-[13px] text-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-text">
                  <input type="radio" name={`obs:${s.id}`} value={value} required className="accent-[#6E9BFF]" />
                  {t(label)}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <div>
                <Label htmlFor={`comment:${s.id}`}>{t("What did you see? (optional, but specific comments carry more weight)")}</Label>
                <Textarea id={`comment:${s.id}`} name={`comment:${s.id}`} rows={2} maxLength={2000} />
              </div>
              <div>
                <Label htmlFor={`example:${s.id}`}>{t("A concrete moment (optional)")}</Label>
                <Textarea id={`example:${s.id}`} name={`example:${s.id}`} rows={2} maxLength={2000} />
              </div>
            </div>
          </fieldset>
        </Card>
      ))}
      <Card className="p-5 space-y-4">
        <div>
          <Label htmlFor="overallComment">{t("Overall comment (optional)")}</Label>
          <Textarea id="overallComment" name="overallComment" rows={3} maxLength={3000} />
        </div>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" name="anonymous" className="mt-1 accent-[#6E9BFF]" />
          <span>
            {t("Hide my name from them.")}{" "}<span className="text-faint">{t("Your answers still count; only your identity is hidden.")}</span>
          </span>
        </label>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (window.confirm(t("Decline this request? No reason will be shared."))) start(async () => {
              await decline();
              router.push("/feedback");
            });
          }}
        >
          {t("Decline request")}
        </Button>
        <SubmitButton pendingText={t("Submitting…")}>{t("Submit feedback")}</SubmitButton>
      </div>
    </form>
  );
}
