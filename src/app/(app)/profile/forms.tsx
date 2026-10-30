"use client";

import { useActionState, useState } from "react";
import { FormMessage, Input, Label, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { createGoal, updateProfile, type ProfileState } from "./actions";
import { useT } from "@/i18n/client";

export function ProfileForm({
  profile,
  categories,
}: {
  profile: { displayName: string; academicYear: number | null; enrollmentYear: number | null; bio: string | null; experience: string | null; interests: string[] };
  categories: { id: string; name: string; color: string }[];
}) {
  const t = useT();
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, null);
  const [interests, setInterests] = useState(profile.interests);
  const year = new Date().getFullYear();
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {interests.map((i) => <input key={i} type="hidden" name="interests" value={i} />)}
      <div>
        <Label htmlFor="displayName">{t("Display name")}</Label>
        <Input id="displayName" name="displayName" defaultValue={profile.displayName} maxLength={60} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="academicYear">{t("Academic year")}</Label>
          <Select id="academicYear" name="academicYear" defaultValue={String(profile.academicYear ?? 1)}>
            {[1, 2, 3, 4, 5, 6].map((y) => (
              <option key={y} value={y}>
                {y === 6 ? t("Alumni") : y >= 4 ? t("MA / year {y}", { y }) : t("Year {y}", { y })}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="enrollmentYear">{t("Started in")}</Label>
          <Select id="enrollmentYear" name="enrollmentYear" defaultValue={String(profile.enrollmentYear ?? year)}>
            {Array.from({ length: 10 }, (_, i) => year - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-1.5">{t("Interests")}</div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const on = interests.includes(c.id);
            return (
              <button
                type="button"
                key={c.id}
                aria-pressed={on}
                onClick={() => setInterests(on ? interests.filter((i) => i !== c.id) : [...interests, c.id])}
                className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-accent bg-accent-soft text-accent-strong" : "border-line text-muted hover:text-text")}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label htmlFor="bio">{t("About your practice")}</Label>
        <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} rows={3} maxLength={1000} />
      </div>
      <div>
        <Label htmlFor="experience">{t("Previous experience")}</Label>
        <Textarea id="experience" name="experience" defaultValue={profile.experience ?? ""} rows={3} maxLength={2000} />
      </div>
      <SubmitButton size="sm" pendingText={t("Saving…")}>
        {t("Save profile")}
      </SubmitButton>
    </form>
  );
}

export function GoalForm({ skills }: { skills: { id: string; name: string }[] }) {
  const t = useT();
  const [state, action] = useActionState<ProfileState, FormData>(createGoal, null);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const results = q.trim() ? skills.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) && !picked.includes(s.id)).slice(0, 6) : [];
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      {picked.map((id) => <input key={id} type="hidden" name="skillIds" value={id} />)}
      <div>
        <Label htmlFor="goal-title">{t("Goal")}</Label>
        <Input id="goal-title" name="title" maxLength={140} placeholder={t("e.g. Run a calmer, faster set")} />
      </div>
      <div>
        <Label htmlFor="goal-desc">{t("Why it matters (optional)")}</Label>
        <Textarea id="goal-desc" name="description" rows={2} maxLength={1000} />
      </div>
      <div>
        <Label htmlFor="goal-skill">{t("Linked skills (")}{picked.length}/5)</Label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {picked.map((id) => (
            <button key={id} type="button" onClick={() => setPicked(picked.filter((p) => p !== id))} className="rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs text-accent-strong">
              {skills.find((s) => s.id === id)?.name} ×
            </button>
          ))}
        </div>
        <Input id="goal-skill" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search skills…")} />
        {results.length > 0 && (
          <ul className="mt-1 rounded-lg border border-line-soft">
            {results.map((s) => (
              <li key={s.id}>
                <button type="button" className="w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={() => picked.length < 5 && (setPicked([...picked, s.id]), setQ(""))}>
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SubmitButton size="sm" variant="secondary" pendingText={t("Adding…")}>
        {t("Add goal")}
      </SubmitButton>
    </form>
  );
}
