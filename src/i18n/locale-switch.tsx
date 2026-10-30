"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { setLocale } from "./actions";
import { LOCALES } from "./config";
import { useLocale, useT } from "./client";

export function LocaleSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <div className={cn("inline-flex rounded-lg border border-line p-0.5", className)} role="group" aria-label={t("Language")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={locale === l}
          onClick={() => start(() => setLocale(l))}
          className={cn(
            "rounded-md px-2 py-0.5 font-mono text-[11px] uppercase transition-colors",
            locale === l ? "bg-surface-3 text-text" : "text-faint hover:text-text",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
