"use client";

import { useActionState } from "react";
import type { Project } from "@prisma/client";
import { FieldError, FormMessage, Hint, Input, Label, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL, VISIBILITY_LABEL } from "@/lib/utils";
import type { ActionState } from "./actions";
import { useT } from "@/i18n/client";

const d = (v: Date | null | undefined) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export function ProjectForm({
  action,
  project,
  defaultVisibility = "PRIVATE",
  defaultSemester,
  linkSkill,
  linkSkillName,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  project?: Project;
  defaultVisibility?: string;
  defaultSemester?: number | null;
  linkSkill?: string;
  linkSkillName?: string;
  submitLabel: string;
}) {
  const t = useT();
  const [state, formAction] = useActionState(action, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-8" noValidate>
      <FormMessage state={state} />
      {linkSkill && (
        <>
          <input type="hidden" name="linkSkill" value={linkSkill} />
          <p className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent-strong">
            {t("This project will be linked to")}{" "}<strong>{linkSkillName}</strong>{t(". You can map it to a rubric level afterwards.")}
          </p>
        </>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="slate-label mb-4">{t("The work")}</legend>
        <div className="sm:col-span-2">
          <Label htmlFor="title">{t("Title")}</Label>
          <Input id="title" name="title" defaultValue={project?.title} required maxLength={140} placeholder={t("e.g. Kitchen Table")} />
          <FieldError errors={fe.title} />
        </div>
        <div>
          <Label htmlFor="type">{t("Project type")}</Label>
          <Select id="type" name="type" defaultValue={project?.type ?? "SHORT_FILM"}>
            {Object.entries(PROJECT_TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {t(l)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="studentRole">{t("Your role")}</Label>
          <Input id="studentRole" name="studentRole" defaultValue={project?.studentRole ?? t("Director")} maxLength={80} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="logline">{t("Logline (optional)")}</Label>
          <Input id="logline" name="logline" defaultValue={project?.logline ?? ""} maxLength={300} placeholder={t("One sentence: who wants what, and what's in the way.")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">{t("Description")}</Label>
          <Textarea id="description" name="description" defaultValue={project?.description} required maxLength={5000} rows={4} />
          <FieldError errors={fe.description} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="slate-label mb-4">{t("Context")}</legend>
        <div>
          <Label htmlFor="course">{t("Course (optional)")}</Label>
          <Input id="course" name="course" defaultValue={project?.course ?? ""} maxLength={140} placeholder={t("e.g. Directing Workshop I")} />
        </div>
        <div>
          <Label htmlFor="semester">{t("Semester")}</Label>
          <Select id="semester" name="semester" defaultValue={String(project?.semester ?? defaultSemester ?? "")}>
            <option value="">{t("Not set")}</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
              <option key={s} value={s}>
                {t("Semester {s} (Year {y}, {term})", { s, y: Math.ceil(s / 2), term: t(s % 2 ? "autumn" : "spring") })}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="startDate">{t("Start date")}</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={d(project?.startDate)} />
        </div>
        <div>
          <Label htmlFor="endDate">{t("End date")}</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={d(project?.endDate)} />
          <FieldError errors={fe.endDate} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5">
        <legend className="slate-label mb-4">{t("Learning")}</legend>
        <div>
          <Label htmlFor="objectives">{t("Learning objectives")}</Label>
          <Textarea id="objectives" name="objectives" defaultValue={project?.objectives.join("\n")} rows={3} placeholder={t("One per line, e.g.\nDirect subtext without stating it\nRun a crew of six")} />
          <Hint>{t("One objective per line.")}</Hint>
        </div>
        <div>
          <Label htmlFor="challenges">{t("Challenges (optional)")}</Label>
          <Textarea id="challenges" name="challenges" defaultValue={project?.challenges ?? ""} rows={3} placeholder={t("What made this hard? Constraints, risks, surprises.")} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="slate-label mb-4">{t("Status & sharing")}</legend>
        <div>
          <Label htmlFor="status">{t("Status")}</Label>
          <Select id="status" name="status" defaultValue={project?.status ?? "PLANNING"}>
            {Object.entries(PROJECT_STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {t(l)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="visibility">{t("Who can see it")}</Label>
          <Select id="visibility" name="visibility" defaultValue={project?.visibility ?? defaultVisibility}>
            {Object.entries(VISIBILITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {t(l)}
              </option>
            ))}
          </Select>
          <Hint>{t("Reflections and your skill estimates stay private regardless.")}</Hint>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton pendingText={t("Saving…")}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
