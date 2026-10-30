"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, GitBranch, MessagesSquare, Sparkles, Clapperboard, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage, Hint, Input, Label, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand";
import { completeOnboarding, type OnboardingState } from "./actions";
import { useT } from "@/i18n/client";

interface Props {
  defaultName: string;
  categories: { id: string; name: string; color: string; description: string }[];
  skills: { id: string; name: string; categoryId: string }[];
  currentYear: number;
}

const STEPS = ["About you", "Interests", "A first goal", "How it works"];

export function OnboardingFlow({ defaultName, categories, skills, currentYear }: Props) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [state, action] = useActionState<OnboardingState, FormData>(completeOnboarding, null);
  const [interests, setInterests] = useState<string[]>([]);
  const [goalSkills, setGoalSkills] = useState<string[]>([]);
  const [skillQuery, setSkillQuery] = useState("");

  const filteredSkills = useMemo(() => {
    const q = skillQuery.toLowerCase().trim();
    return skills.filter((s) => (q ? s.name.toLowerCase().includes(q) : interests.includes(s.categoryId))).slice(0, 18);
  }, [skills, skillQuery, interests]);

  const toggle = (list: string[], set: (v: string[]) => void, id: string, max = 99) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : list.length >= max ? list : [...list, id]);

  return (
    <form action={action} className="w-full max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <Wordmark />
        <ol className="flex gap-1.5" aria-label={t("Onboarding progress")}>
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={cn("h-1 w-8 rounded-full", i <= step ? "bg-accent" : "bg-surface-3")}>
              <span className="sr-only">{t(s)}</span>
            </li>
          ))}
        </ol>
      </div>

      <FormMessage state={state} />
      {interests.map((i) => <input key={i} type="hidden" name="interests" value={i} />)}
      {goalSkills.map((i) => <input key={i} type="hidden" name="goalSkills" value={i} />)}

      <div className="card p-6 sm:p-8 overflow-hidden">

        <section className="animate-[fadein_.25s_ease-out]" hidden={step !== 0} aria-labelledby="s0">
          <div className="slate-label mb-2">{t("Step 1 of 4")}</div>
          <h1 id="s0" className="font-display text-4xl">{t("Welcome to your director's map.")}</h1>
          <p className="mt-2 text-muted">{t("A few quick questions. You can change all of this later.")}</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="displayName">{t("Preferred display name")}</Label>
              <Input id="displayName" name="displayName" defaultValue={defaultName} required minLength={2} maxLength={60} />
            </div>
            <div>
              <Label htmlFor="academicYear">{t("Academic year")}</Label>
              <Select id="academicYear" name="academicYear" defaultValue="1">
                <option value="1">{t("1st year (BA)")}</option>
                <option value="2">{t("2nd year (BA)")}</option>
                <option value="3">{t("3rd year (BA)")}</option>
                <option value="4">{t("MA / 4th year")}</option>
                <option value="5">{t("MA 2nd year")}</option>
                <option value="6">{t("Alumni")}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="enrollmentYear">{t("Year you started")}</Label>
              <Select id="enrollmentYear" name="enrollmentYear" defaultValue={String(currentYear - (new Date().getMonth() >= 8 ? 0 : 1))}>
                {Array.from({ length: 8 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
              <Hint>{t("Used to organise your timeline into semesters.")}</Hint>
            </div>
          </div>
        </section>

        <section className="animate-[fadein_.25s_ease-out]" hidden={step !== 1} aria-labelledby="s1">
          <div className="slate-label mb-2">{t("Step 2 of 4")}</div>
          <h2 id="s1" className="font-display text-4xl">{t("What pulls you in?")}</h2>
          <p className="mt-2 text-muted">{t("Pick the areas you're most curious about. This shapes recommendations, never your assessment.")}</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {categories.map((c) => {
              const on = interests.includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  aria-pressed={on}
                  onClick={() => toggle(interests, setInterests, c.id)}
                  className={cn(
                    "text-left rounded-xl border p-3.5 transition-colors",
                    on ? "border-accent/60 bg-accent-soft" : "border-line hover:border-faint",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span className="text-sm font-medium">{c.name}</span>
                    {on && <Check className="ml-auto size-4 text-accent" aria-hidden />}
                  </div>
                  <p className="mt-1 text-xs text-faint line-clamp-2">{c.description}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-6">
            <Label htmlFor="experience">{t("Previous filmmaking experience (optional)")}</Label>
            <Textarea id="experience" name="experience" maxLength={2000} placeholder={t("e.g. Shot music videos for friends, assisted on a documentary, theatre directing in secondary school…")} />
          </div>
        </section>

        <section className="animate-[fadein_.25s_ease-out]" hidden={step !== 2} aria-labelledby="s2">
          <div className="slate-label mb-2">{t("Step 3 of 4")}</div>
          <h2 id="s2" className="font-display text-4xl">{t("Set a first learning goal")}</h2>
          <p className="mt-2 text-muted">{t("Optional, but goals help FraMETUp suggest useful next challenges.")}</p>
          <div className="mt-6">
            <Label htmlFor="goalTitle">{t("Your goal, in your own words")}</Label>
            <Input id="goalTitle" name="goalTitle" maxLength={140} placeholder={t("e.g. Get more confident giving actors notes on set")} />
          </div>
          <div className="mt-5">
            <Label htmlFor="skillQuery">{t("Link it to up to 5 skills")}</Label>
            <Input id="skillQuery" value={skillQuery} onChange={(e) => setSkillQuery(e.target.value)} placeholder={t("Search skills…")} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {filteredSkills.map((s) => {
                const on = goalSkills.includes(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    aria-pressed={on}
                    onClick={() => toggle(goalSkills, setGoalSkills, s.id, 5)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      on ? "border-accent bg-accent-soft text-accent-strong" : "border-line text-muted hover:text-text",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
              {filteredSkills.length === 0 && <p className="text-xs text-faint">{t("Choose interests in step 2 or search for a skill.")}</p>}
            </div>
          </div>
        </section>

        <section className="animate-[fadein_.25s_ease-out]" hidden={step !== 3} aria-labelledby="s3">
          <div className="slate-label mb-2">{t("Step 4 of 4")}</div>
          <h2 id="s3" className="font-display text-4xl">{t("How FraMETUp thinks")}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { icon: GitBranch, title: t("Skills connect"), body: t("105 directing skills in 8 categories form a map. Links show which skills support others — guidance, never locks.") },
              { icon: Gauge, title: t("Mastery ≠ XP"), body: t("XP logs your practice. Mastery is the strength of evidence that you can do something. Doing more doesn't automatically mean more skill.") },
              { icon: Clapperboard, title: t("Projects are evidence"), body: t("Link projects to skills, map them against rubrics, and attach documents. Demanding work counts for more.") },
              { icon: MessagesSquare, title: t("Several perspectives"), body: t("Self-assessment, peer feedback, project evidence and (optional) AI suggestions each add a different view.") },
              { icon: Sparkles, title: t("AI only suggests"), body: t("AI help is opt-in. It never grades you, never sees what you don't share, and nothing counts until you accept it.") },
              { icon: Check, title: t("Unassessed is not weak"), body: t("Hollow nodes on your tree just mean there's no evidence yet. That's expected — especially at the start.") },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-line-soft bg-ink/40 p-4">
                <Icon className="size-4 text-accent" aria-hidden />
                <h3 className="mt-2 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <fieldset className="mt-6">
            <legend className="text-sm font-medium mb-2">{t("Where would you like to start?")}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["skills", t("Explore my skill tree")],
                ["assess", t("Quick self-assessment")],
                ["dashboard", t("Go to my dashboard")],
              ].map(([v, l], i) => (
                <label key={v} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft cursor-pointer">
                  <input type="radio" name="next" value={v} defaultChecked={i === 0} className="accent-[#6E9BFF]" />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <div className="mt-8 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="size-4" aria-hidden />{" "}{t("Back")}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>
              {t("Continue")}{" "}<ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <SubmitButton pendingText={t("Setting up…")}>{t("Finish setup")}</SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}
