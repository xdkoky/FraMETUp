"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { play } from "@/lib/sound";

const COLORS = ["#58CC02", "#1CB0F6", "#FFC800", "#FF4B4B", "#CE82FF", "#FF9600", "#2EC4B6"];

/** A one-shot confetti burst. Renders nothing for people who prefer reduced motion. */
export function Confetti({ pieces = 46, className }: { pieces?: number; className?: string }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = (Math.PI * 2 * i) / pieces + (Math.random() - 0.5) * 0.5;
        const power = 140 + Math.random() * 170;
        return {
          id: i,
          color: COLORS[i % COLORS.length],
          x: Math.cos(angle) * power,
          y: Math.sin(angle) * power * 0.75 - 90,
          fall: 220 + Math.random() * 220,
          rot: (Math.random() - 0.5) * 900,
          w: 6 + Math.random() * 6,
          h: 8 + Math.random() * 8,
          round: Math.random() < 0.3,
          delay: Math.random() * 0.08,
          dur: 1.3 + Math.random() * 0.7,
        };
      }),
    [pieces],
  );
  if (reduce) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-visible ${className ?? ""}`} aria-hidden>
      <div className="absolute left-1/2 top-1/3">
        {bits.map((b) => (
          <motion.span
            key={b.id}
            className="absolute block"
            style={{ width: b.w, height: b.round ? b.w : b.h, background: b.color, borderRadius: b.round ? 999 : 2 }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
            animate={{ x: [0, b.x, b.x * 1.1], y: [0, b.y, b.y + b.fall], rotate: b.rot, opacity: [1, 1, 0], scale: [0.4, 1, 0.9] }}
            transition={{ duration: b.dur, delay: b.delay, ease: ["easeOut", "easeIn"], times: [0, 0.35, 1] }}
          />
        ))}
      </div>
    </div>
  );
}

/** Counts up to `value` with a springy finish, ticking an XP sound as it goes. */
export function CountUp({ value, prefix = "", suffix = "", sound = false, delay = 0 }: { value: number; prefix?: string; suffix?: string; sound?: boolean; delay?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const lastTick = useRef(0);
  useEffect(() => {
    if (reduce || value === 0) return setShown(value);
    const ctl = animate(0, value, {
      duration: Math.min(1.2, 0.4 + value / 60),
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const n = Math.round(v);
        setShown(n);
        if (sound && n !== lastTick.current && n % Math.max(1, Math.ceil(value / 6)) === 0) {
          lastTick.current = n;
          play("xp");
        }
      },
    });
    return () => ctl.stop();
  }, [value, reduce, sound, delay]);
  return (
    <span className="tabular-nums">
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}
