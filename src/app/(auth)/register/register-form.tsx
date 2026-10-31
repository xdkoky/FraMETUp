"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FieldError, FormMessage, Hint, Input, Label, SubmitButton } from "@/components/ui/form";
import { registerAction, type AuthState } from "../actions";
import { useT } from "@/i18n/client";

export function RegisterForm() {
  const t = useT();
  const [state, action] = useActionState<AuthState, FormData>(registerAction, null);
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <FormMessage state={state} />
      <div>
        <Label htmlFor="displayName">{t("What should we call you?")}</Label>
        <Input id="displayName" name="displayName" autoComplete="nickname" required />
        <FieldError errors={state?.fieldErrors?.displayName} />
      </div>
      <div>
        <Label htmlFor="email">{t("Email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError errors={state?.fieldErrors?.email} />
      </div>
      <div>
        <Label htmlFor="password">{t("Password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
        <Hint>{t("At least 10 characters, mixing letters with numbers or symbols.")}</Hint>
        <FieldError errors={state?.fieldErrors?.password} />
      </div>
      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input type="checkbox" name="privacy" className="mt-1 accent-[var(--color-accent)]" />
        <span>
          {t("I have read the")}{" "}
          <Link href="/privacy" className="text-accent hover:underline" target="_blank">
            {t("privacy notice")}
          </Link>
          {t(". I understand my data stays private unless I choose to share it.")}
        </span>
      </label>
      <FieldError errors={state?.fieldErrors?.privacy} />
      <SubmitButton className="w-full" pendingText={t("Creating account…")}>
        {t("Create account")}
      </SubmitButton>
    </form>
  );
}
