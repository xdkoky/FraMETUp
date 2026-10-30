"use client";

import { useActionState } from "react";
import { FormMessage, Input, Label, Select, SubmitButton, Textarea } from "@/components/ui/form";
import type { ActionState } from "../../actions";

export function ReflectionForm({
  action,
  prompts,
  defaultTitle,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  prompts: { key: string; label: string }[];
  defaultTitle: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={defaultTitle} maxLength={140} />
      </div>
      {prompts.map((p, i) => (
        <div key={p.key}>
          <Label htmlFor={p.key}>
            <span className="font-mono text-xs text-faint mr-2">{String(i + 1).padStart(2, "0")}</span>
            {p.label}
          </Label>
          <Textarea id={p.key} name={p.key} rows={3} maxLength={4000} />
        </div>
      ))}
      <div className="grid gap-4 sm:grid-cols-2 items-end">
        <div>
          <Label htmlFor="visibility">Visibility</Label>
          <Select id="visibility" name="visibility" defaultValue="PRIVATE">
            <option value="PRIVATE">Private — only me</option>
            <option value="COLLABORATORS">Share with linked collaborators</option>
          </Select>
        </div>
        <div className="flex justify-end">
          <SubmitButton pendingText="Saving…">Save reflection</SubmitButton>
        </div>
      </div>
    </form>
  );
}
