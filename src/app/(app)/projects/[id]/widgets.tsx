"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Link2, Paperclip, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, FormMessage, Hint, Input, Label, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { cn, PROJECT_STATUS_LABEL } from "@/lib/utils";
import type { ActionState } from "../actions";
import { useT } from "@/i18n/client";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export interface PickerSkill {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  levels: string[];
}

export function SkillLinkForm({
  action,
  skills,
  linkedIds,
  initialSkillId,
}: {
  action: Action;
  skills: PickerSkill[];
  linkedIds: string[];
  initialSkillId?: string;
}) {
  const t = useT();
  const [state, formAction] = useActionState(action, null);
  const [skillId, setSkillId] = useState(initialSkillId ?? "");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("");
  const skill = skills.find((s) => s.id === skillId);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return skills.filter((s) => !q || s.name.toLowerCase().includes(q) || s.categoryName.toLowerCase().includes(q));
  }, [skills, query]);
  const groups = useMemo(() => {
    const m = new Map<string, PickerSkill[]>();
    for (const s of filtered) m.set(s.categoryName, [...(m.get(s.categoryName) ?? []), s]);
    return [...m.entries()];
  }, [filtered]);

  return (
    <form action={formAction} className="space-y-4" id="link-skill">
      <FormMessage state={state} />
      <div>
        <Label htmlFor="skill-search">{t("Skill")}</Label>
        <Input id="skill-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Filter skills…")} className="mb-2" />
        <Select name="skillId" value={skillId} onChange={(e) => setSkillId(e.target.value)} required aria-label={t("Choose skill")}>
          <option value="">{t("Choose a skill…")}</option>
          {groups.map(([cat, list]) => (
            <optgroup key={cat} label={cat}>
              {list.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {linkedIds.includes(s.id) ? " (linked — update)" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="relevance">{t("Relevance")}</Label>
          <Select id="relevance" name="relevance" defaultValue="PRIMARY">
            <option value="PRIMARY">{t("Primary focus")}</option>
            <option value="SECONDARY">{t("Secondary")}</option>
            <option value="INCIDENTAL">{t("Incidental")}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="difficulty">{t("Difficulty")}</Label>
          <Select id="difficulty" name="difficulty" defaultValue="2">
            <option value="1">{t("Routine")}</option>
            <option value="2">{t("Stretching")}</option>
            <option value="3">{t("Demanding")}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="independence">{t("Independence")}</Label>
          <Select id="independence" name="independence" defaultValue="INDEPENDENT">
            <option value="INDEPENDENT">{t("Independently")}</option>
            <option value="WITH_SUPPORT">{t("With some support")}</option>
            <option value="WITH_GUIDANCE">{t("With guidance")}</option>
          </Select>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-medium mb-1.5">{t("Map against the rubric (optional)")}</legend>
        <Hint className="mt-0 mb-2">{t("Which descriptor best matches what you actually did in")}{" "}<em>{t("this")}</em>{" "}{t("project? Leave blank to log it as practice only.")}</Hint>
        <input type="hidden" name="demonstratedLevel" value={level} />
        {skill ? (
          <div className="space-y-1.5" role="radiogroup" aria-label={t("Demonstrated level")}>
            <button
              type="button"
              role="radio"
              aria-checked={level === ""}
              onClick={() => setLevel("")}
              className={cn("w-full rounded-lg border px-3 py-2 text-left text-[13px]", level === "" ? "border-accent bg-accent-soft" : "border-line-soft text-muted hover:border-line")}
            >
              {t("Practice only — not mapped")}
            </button>
            {skill.levels.map((l, i) => (
              <button
                type="button"
                role="radio"
                aria-checked={level === String(i + 1)}
                key={i}
                onClick={() => setLevel(String(i + 1))}
                className={cn(
                  "flex w-full gap-3 rounded-lg border px-3 py-2 text-left text-[13px] leading-snug",
                  level === String(i + 1) ? "border-accent bg-accent-soft text-text" : "border-line-soft text-muted hover:border-line",
                )}
              >
                <span className="font-mono text-xs text-faint mt-0.5">L{i + 1}</span>
                {l}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-faint">{t("Choose a skill to see its rubric.")}</p>
        )}
      </fieldset>
      <div>
        <Label htmlFor="justification">{t("What did you do that shows this?")}{" "}{Number(level) >= 3 && <span className="text-amber">{t("(required)")}</span>}</Label>
        <Textarea id="justification" name="justification" rows={2} maxLength={2000} placeholder={t("Point to concrete moments, decisions or documents.")} />
        <FieldError errors={state?.fieldErrors?.justification} />
      </div>
      <SubmitButton size="sm" pendingText={t("Saving…")}>
        <Link2 className="size-4" aria-hidden />{" "}{t("Save skill evidence")}
      </SubmitButton>
    </form>
  );
}

export function EvidenceForm({ action, maxMb }: { action: Action; maxMb: number }) {
  const t = useT();
  const [state, formAction] = useActionState(action, null);
  const [mode, setMode] = useState<"link" | "file" | "note">("link");
  return (
    <form action={formAction} className="space-y-3" encType="multipart/form-data">
      <FormMessage state={state} />
      <div className="flex gap-1 rounded-lg bg-ink/50 p-1 w-fit" role="tablist" aria-label={t("Evidence type")}>
        {(["link", "file", "note"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("rounded-md px-3 py-1 text-xs capitalize", mode === m ? "bg-surface-3 text-text" : "text-muted hover:text-text")}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ev-kind">{t("Kind")}</Label>
          <Select id="ev-kind" name="kind" key={mode} defaultValue={mode === "link" ? "VIDEO_LINK" : mode === "note" ? "NOTE" : "SHOT_LIST"}>
            {mode === "link" && (
              <>
                <option value="VIDEO_LINK">{t("Video link")}</option>
                <option value="DOCUMENT_LINK">{t("Document link")}</option>
              </>
            )}
            <option value="SCRIPT">{t("Script")}</option>
            <option value="STORYBOARD">{t("Storyboard")}</option>
            <option value="SHOT_LIST">{t("Shot list / floor plan")}</option>
            <option value="DIRECTORS_NOTES">{t("Director's notes")}</option>
            <option value="NOTE">{t("Note")}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ev-title">{t("Title")}</Label>
          <Input id="ev-title" name="title" required maxLength={200} />
          <FieldError errors={state?.fieldErrors?.title} />
        </div>
      </div>
      {mode === "link" && (
        <div>
          <Label htmlFor="ev-url">{t("Link (https)")}</Label>
          <Input id="ev-url" name="url" type="url" placeholder={t("https://vimeo.com/… (use private links where possible)")} />
          <FieldError errors={state?.fieldErrors?.url} />
        </div>
      )}
      {mode === "file" && (
        <div>
          <Label htmlFor="ev-file">{t("File")}</Label>
          <input id="ev-file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.md" className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-3 file:py-1.5 file:text-text" />
          <Hint>{t("PDF, PNG, JPEG, text or Markdown up to")}{" "}{maxMb}{" "}{t("MB. For films, add a private link instead of uploading.")}</Hint>
        </div>
      )}
      <div>
        <Label htmlFor="ev-desc">{mode === "note" ? t("Note") : t("Description (optional)")}</Label>
        <Textarea id="ev-desc" name="description" rows={2} maxLength={2000} />
      </div>
      {mode !== "note" && (
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" name="rightsConfirmed" className="mt-0.5 accent-[var(--color-accent)]" />
          {t("I have the right to store and share this with the people I choose (actors, crew and music rights included).")}
        </label>
      )}
      <FieldError errors={state?.fieldErrors?.rightsConfirmed} />
      <SubmitButton size="sm" variant="secondary" pendingText={t("Adding…")}>
        <Paperclip className="size-4" aria-hidden />{" "}{t("Add evidence")}
      </SubmitButton>
    </form>
  );
}

export function CollaboratorForm({ action }: { action: Action }) {
  const t = useT();
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="c-name">{t("Name")}</Label>
          <Input id="c-name" name="name" required maxLength={100} />
          <FieldError errors={state?.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="c-role">{t("Role")}</Label>
          <Input id="c-role" name="role" required maxLength={80} placeholder={t("Cinematographer, lead actor…")} />
          <FieldError errors={state?.fieldErrors?.role} />
        </div>
      </div>
      <div>
        <Label htmlFor="c-email">{t("FraMETUp email (optional)")}</Label>
        <Input id="c-email" name="email" type="email" placeholder={t("Links their account so you can request their feedback")} />
      </div>
      <SubmitButton size="sm" variant="secondary" pendingText={t("Adding…")}>
        <UserPlus className="size-4" aria-hidden />{" "}{t("Add collaborator")}
      </SubmitButton>
    </form>
  );
}

export function StatusSelect({ action, status }: { action: (fd: FormData) => Promise<void>; status: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label={t("Project status")}
      defaultValue={status}
      disabled={pending}
      className="h-9 w-auto text-xs"
      onChange={(e) => {
        const fd = new FormData();
        fd.set("status", e.target.value);
        start(() => action(fd));
      }}
    >
      {Object.entries(PROJECT_STATUS_LABEL).map(([v, l]) => (
        <option key={v} value={v}>
          {t(l)}
        </option>
      ))}
    </Select>
  );
}

export function ConfirmButton({
  action,
  label,
  confirmText,
  variant = "ghost",
  icon = true,
}: {
  action: () => Promise<void>;
  label: string;
  confirmText: string;
  variant?: "ghost" | "danger";
  icon?: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={pending}
      aria-label={label ? undefined : confirmText.replace(/\?$/, "")}
      onClick={() => {
        if (window.confirm(confirmText)) start(() => action());
      }}
    >
      {icon && <Trash2 className="size-3.5" aria-hidden />}
      {label}
    </Button>
  );
}
