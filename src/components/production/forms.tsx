"use client";

import { useActionState, useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { FormState } from "@/app/(app)/production/actions";

/** A form bound to a server action that returns { ok | error }, with inline feedback. */
export function ActionForm({
  action,
  children,
  submit,
  className,
  resetOnOk = true,
  extraButtons,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit: string;
  className?: string;
  resetOnOk?: boolean;
  extraButtons?: React.ReactNode;
}) {
  const t = useT();
  const [state, run, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      {state?.error && <p className="mt-2 text-[13px] font-bold text-danger">{t(state.error)}</p>}
      {state?.ok && <p className="mt-2 text-[13px] font-bold text-success-strong">{t(state.ok)}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
          {pending ? t("Saving…") : t(submit)}
        </button>
        {extraButtons}
      </div>
    </form>
  );
}
