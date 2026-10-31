"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { play, setSoundEnabled, soundEnabled, SOUND_EVENT, type SoundName } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

const NAMES = new Set<SoundName>(["tap", "select", "correct", "wrong", "complete", "xp", "streak", "swoosh", "toggle"]);

/**
 * One delegated listener gives every pressable control a soft tap.
 * Elements can choose their own sound with data-sound="select" (or "none" to stay silent).
 */
export function UiSounds() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-sound], .press, button, [role='tab']");
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      const wanted = el.dataset.sound;
      if (wanted === "none") return;
      if (wanted && NAMES.has(wanted as SoundName)) return play(wanted as SoundName);
      if (el.classList.contains("press")) play("tap");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}

/** Sound effects on/off. Remembered on this device. */
export function SoundSwitch({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const t = useT();
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(soundEnabled());
    const sync = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener(SOUND_EVENT, sync);
    return () => window.removeEventListener(SOUND_EVENT, sync);
  }, []);
  const label = on ? t("Sound effects on") : t("Sound effects off");
  return (
    <button
      type="button"
      data-sound="none"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={() => {
        setSoundEnabled(!on);
        setOn(!on);
        if (!on) play("toggle");
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-line text-faint transition-colors hover:text-text",
        withLabel ? "h-8 px-2.5 text-[12.5px] font-bold" : "size-7 justify-center",
        on && "text-text",
        className,
      )}
    >
      {on ? <Volume2 className="size-3.5" aria-hidden /> : <VolumeX className="size-3.5" aria-hidden />}
      {withLabel && <span>{on ? t("On") : t("Off")}</span>}
    </button>
  );
}
