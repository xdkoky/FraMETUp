"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

export type ThemePref = "light" | "dark" | "auto";

/** Applies a theme choice instantly and remembers it for a year. "auto" follows the device's light/dark setting. */
function apply(pref: ThemePref) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (pref !== "auto") root.classList.add(pref);
  document.cookie = `theme=${pref}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeSwitch({ initial, className }: { initial: ThemePref; className?: string }) {
  const t = useT();
  const [pref, setPref] = useState<ThemePref>(initial);
  useEffect(() => setPref(initial), [initial]);
  const options: { v: ThemePref; label: string; Icon: typeof Sun }[] = [
    { v: "light", label: t("Light"), Icon: Sun },
    { v: "auto", label: t("Auto (follows your device)"), Icon: Monitor },
    { v: "dark", label: t("Dark"), Icon: Moon },
  ];
  return (
    <div className={cn("inline-flex rounded-lg border border-line p-0.5", className)} role="group" aria-label={t("Appearance")}>
      {options.map(({ v, label, Icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={pref === v}
          aria-label={label}
          title={label}
          onClick={() => {
            setPref(v);
            apply(v);
          }}
          className={cn("grid size-6 place-items-center rounded-md transition-colors", pref === v ? "bg-surface-3 text-text" : "text-faint hover:text-text")}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
