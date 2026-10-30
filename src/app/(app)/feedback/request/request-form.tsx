"use client";

import { useActionState, useMemo, useState } from "react";
import { X } from "lucide-react";
import { FieldError, FormMessage, Hint, Input, Label, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { requestFeedback, type FeedbackState } from "../actions";

interface P {
  id: string;
  title: string;
  skillIds: string[];
  collaborators: { name: string; role: string; email: string }[];
}

export function RequestForm({
  projects,
  skills,
  initialProjectId,
  initialSkillId,
}: {
  projects: P[];
  skills: { id: string; name: string; categoryName: string }[];
  initialProjectId?: string;
  initialSkillId?: string;
}) {
  const [state, action] = useActionState<FeedbackState, FormData>(requestFeedback, null);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const project = projects.find((p) => p.id === projectId);
  const [selected, setSelected] = useState<string[]>(initialSkillId ? [initialSkillId] : []);
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState("");
  const [q, setQ] = useState("");
  const skillName = useMemo(() => Object.fromEntries(skills.map((s) => [s.id, s.name])), [skills]);
  const suggestions = project ? project.skillIds.filter((id) => !selected.includes(id)) : [];
  const results = q.trim() ? skills.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) && !selected.includes(s.id)).slice(0, 8) : [];
  const add = (id: string) => selected.length < 6 && setSelected([...selected, id]);

  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      {selected.map((id) => <input key={id} type="hidden" name="skillIds" value={id} />)}
      <div>
        <Label htmlFor="projectId">Project (optional)</Label>
        <Select id="projectId" name="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">General feedback — not tied to a project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
      </div>
      {project && project.collaborators.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-1.5">Collaborators on DIRECTOR OS</div>
          <div className="flex flex-wrap gap-1.5">
            {project.collaborators.map((c) => (
              <button
                key={c.email}
                type="button"
                onClick={() => {
                  setEmail(c.email);
                  setRelation(c.role);
                }}
                className={cn("rounded-full border px-3 py-1 text-xs", email === c.email ? "border-accent bg-accent-soft text-accent-strong" : "border-line text-muted hover:text-text")}
              >
                {c.name} · {c.role}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="reviewerEmail">Reviewer&apos;s email</Label>
          <Input id="reviewerEmail" name="reviewerEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FieldError errors={state?.fieldErrors?.reviewerEmail} />
        </div>
        <div>
          <Label htmlFor="reviewerRelation">Their role in the work</Label>
          <Input id="reviewerRelation" name="reviewerRelation" value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="Cinematographer, lead actor, editor…" required />
          <FieldError errors={state?.fieldErrors?.reviewerRelation} />
        </div>
      </div>
      <div>
        <Label htmlFor="skill-q">Skills to assess ({selected.length}/6)</Label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs text-accent-strong">
              {skillName[id]}
              <button type="button" onClick={() => setSelected(selected.filter((s) => s !== id))} aria-label={`Remove ${skillName[id]}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        {suggestions.length > 0 && (
          <div className="mb-2">
            <Hint className="mt-0 mb-1">Linked to this project:</Hint>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((id) => (
                <button key={id} type="button" onClick={() => add(id)} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:text-text">
                  + {skillName[id]}
                </button>
              ))}
            </div>
          </div>
        )}
        <Input id="skill-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for another skill…" />
        {results.length > 0 && (
          <ul className="mt-1 rounded-lg border border-line-soft">
            {results.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => (add(s.id), setQ(""))} className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2">
                  {s.name} <span className="text-xs text-faint">· {s.categoryName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <FieldError errors={state?.fieldErrors?.skillIds} />
        <Hint>Don&apos;t ask a cinematographer about character writing — match skills to what they saw.</Hint>
      </div>
      <div>
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea id="message" name="message" rows={3} maxLength={1000} placeholder="Honest feedback helps me most. Only rate what you actually saw." />
      </div>
      <div className="flex justify-end">
        <SubmitButton disabled={!selected.length} pendingText="Sending…">
          Send request
        </SubmitButton>
      </div>
    </form>
  );
}
