"use client";

import { useActionState } from "react";
import { FormMessage, Hint, Input, Label, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { addDependency, createSkill, reviseRubric, updateSkill, type AdminState } from "../actions";
import { useT } from "@/i18n/client";

export function NewSkillForm({ categories }: { categories: { id: string; name: string }[] }) {
  const t = useT();
  const [state, action] = useActionState<AdminState, FormData>(createSkill, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <div>
        <Label htmlFor="categoryId">{t("Category")}</Label>
        <Select id="categoryId" name="categoryId">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="name">{t("Name")}</Label>
        <Input id="name" name="name" />
      </div>
      <div>
        <Label htmlFor="slug">{t("Stable id (slug)")}</Label>
        <Input id="slug" name="slug" placeholder={t("e.g. intimacy-coordination")} />
        <Hint>{t("Permanent — used to keep history intact.")}</Hint>
      </div>
      <SubmitButton size="sm">{t("Create skill")}</SubmitButton>
    </form>
  );
}

export function SkillEditForm({
  skillId,
  skill,
}: {
  skillId: string;
  skill: { name: string; description: string; outcomes: string[]; criteria: string[]; evidenceTypes: string[]; exercises: string[] };
}) {
  const t = useT();
  const [state, action] = useActionState<AdminState, FormData>(updateSkill.bind(null, skillId), null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div>
        <Label htmlFor="name">{t("Name")}</Label>
        <Input id="name" name="name" defaultValue={skill.name} />
      </div>
      <div>
        <Label htmlFor="description">{t("Description")}</Label>
        <Textarea id="description" name="description" defaultValue={skill.description} rows={3} />
      </div>
      {(
        [
          ["outcomes", "Observable learning outcomes"],
          ["criteria", "Assessment criteria"],
          ["evidenceTypes", "Evidence types"],
          ["exercises", "Suggested exercises"],
        ] as const
      ).map(([k, l]) => (
        <div key={k}>
          <Label htmlFor={k}>{t(l)}</Label>
          <Textarea id={k} name={k} defaultValue={skill[k].join("\n")} rows={3} />
          <Hint>{t("One per line.")}</Hint>
        </div>
      ))}
      <SubmitButton size="sm">{t("Save skill")}</SubmitButton>
    </form>
  );
}

export function RubricForm({ skillId, levels }: { skillId: string; levels: string[] }) {
  const t = useT();
  const [state, action] = useActionState<AdminState, FormData>(reviseRubric.bind(null, skillId), null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      {levels.map((l, i) => (
        <div key={i}>
          <Label htmlFor={`level${i + 1}`}>{t("Level")}{" "}{i + 1}</Label>
          <Textarea id={`level${i + 1}`} name={`level${i + 1}`} defaultValue={l} rows={2} />
        </div>
      ))}
      <div>
        <Label htmlFor="note">{t("Change note")}</Label>
        <Input id="note" name="note" placeholder={t("Why is the rubric changing?")} />
      </div>
      <SubmitButton size="sm" variant="amber">{t("Publish new rubric version")}</SubmitButton>
    </form>
  );
}

export function DependencyForm({ skillId, skills }: { skillId: string; skills: { id: string; name: string }[] }) {
  const t = useT();
  const [state, action] = useActionState<AdminState, FormData>(addDependency.bind(null, skillId), null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Select name="fromSkillId" aria-label={t("Skill")}>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select name="kind" aria-label={t("Link type")}>
          <option value="PREREQUISITE">{t("builds toward this")}</option>
          <option value="RELATED">related</option>
        </Select>
      </div>
      <SubmitButton size="sm" variant="secondary">{t("Add link")}</SubmitButton>
    </form>
  );
}
