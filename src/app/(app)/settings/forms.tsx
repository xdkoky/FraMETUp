"use client";

import { useActionState } from "react";
import { FormMessage, Hint, Input, Label, Select, SubmitButton } from "@/components/ui/form";
import { changePassword, deleteMyAccount, updatePrivacy, type SettingsState } from "./actions";

export function PrivacyForm({
  settings,
  externalAI,
}: {
  settings: { profileVisibility: string; defaultProjectVisibility: string; allowReviewRequests: boolean; aiConsent: boolean; retentionDays: number | null };
  externalAI: boolean;
}) {
  const [state, action] = useActionState<SettingsState, FormData>(updatePrivacy, null);
  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profileVisibility">Profile visibility</Label>
          <Select id="profileVisibility" name="profileVisibility" defaultValue={settings.profileVisibility === "COLLABORATORS" ? "PRIVATE" : settings.profileVisibility}>
            <option value="PRIVATE">Private</option>
            <option value="COHORT">Visible to my cohort</option>
          </Select>
          <Hint>Only your name and bio. Skill estimates are never shared.</Hint>
        </div>
        <div>
          <Label htmlFor="defaultProjectVisibility">Default for new projects</Label>
          <Select id="defaultProjectVisibility" name="defaultProjectVisibility" defaultValue={settings.defaultProjectVisibility}>
            <option value="PRIVATE">Private</option>
            <option value="COLLABORATORS">Collaborators</option>
            <option value="COHORT">My cohort</option>
          </Select>
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="allowReviewRequests" defaultChecked={settings.allowReviewRequests} className="mt-1 accent-[#6E9BFF]" />
        <span>
          Allow others to request my feedback
          <span className="block text-xs text-faint">You can always decline individual requests without giving a reason.</span>
        </span>
      </label>

      <div className="rounded-xl border border-line-soft bg-ink/40 p-4">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="aiConsent" defaultChecked={settings.aiConsent} className="mt-1 accent-[#6E9BFF]" />
          <span>
            Allow AI analysis of reflections I choose to analyse
            <span className="mt-1 block text-xs text-muted leading-relaxed">
              When enabled{externalAI ? "" : " and an administrator configures a provider"}, the text of a reflection you explicitly send for analysis — plus the project title, type and
              skill catalogue — is sent to Anthropic&apos;s Claude API. Files, videos, peer feedback and other students&apos; data are never sent. Results are stored as suggestions
              only; nothing counts toward your skills until you accept it. Without consent, a local keyword heuristic runs entirely on this server.
            </span>
            {!externalAI && <span className="mt-1 block text-xs text-amber">No external AI provider is configured on this server right now.</span>}
          </span>
        </label>
      </div>

      <div className="max-w-xs">
        <Label htmlFor="retentionDays">Data retention</Label>
        <Select id="retentionDays" name="retentionDays" defaultValue={settings.retentionDays ? String(settings.retentionDays) : ""}>
          <option value="">Keep until I delete it</option>
          <option value="365">Delete inactive data after 1 year</option>
          <option value="1095">Delete inactive data after 3 years</option>
          <option value="1825">Delete inactive data after 5 years</option>
        </Select>
        <Hint>Recorded preference; an automated retention job is on the roadmap.</Hint>
      </div>
      <SubmitButton size="sm" pendingText="Saving…">
        Save privacy settings
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<SettingsState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="current">Current password</Label>
          <Input id="current" name="current" type="password" autoComplete="current-password" />
        </div>
        <div>
          <Label htmlFor="next">New password</Label>
          <Input id="next" name="next" type="password" autoComplete="new-password" minLength={10} />
        </div>
      </div>
      <SubmitButton size="sm" variant="secondary" pendingText="Updating…">
        Change password
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<SettingsState, FormData>(deleteMyAccount, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <p className="text-sm text-muted">
        Permanently deletes your account, projects, reflections, assessments and uploaded files. Feedback you wrote for others is removed too, and their estimates are
        recalculated. This cannot be undone — export your data first.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="del-password">Password</Label>
          <Input id="del-password" name="password" type="password" autoComplete="current-password" />
        </div>
        <div>
          <Label htmlFor="del-confirm">Type DELETE</Label>
          <Input id="del-confirm" name="confirm" autoComplete="off" />
        </div>
      </div>
      <SubmitButton size="sm" variant="danger" pendingText="Deleting…">
        Delete my account
      </SubmitButton>
    </form>
  );
}
