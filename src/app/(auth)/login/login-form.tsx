"use client";

import { useActionState } from "react";
import { FieldError, FormMessage, Input, Label, SubmitButton } from "@/components/ui/form";
import { loginAction, type AuthState } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, null);
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError errors={state?.fieldErrors?.email} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        <FieldError errors={state?.fieldErrors?.password} />
      </div>
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
