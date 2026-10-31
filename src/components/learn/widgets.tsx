"use client";

import { useId, useState } from "react";
import type { WidgetKind } from "@/lib/learn";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { CharacterGroup, type Mood } from "@/components/characters/character";

/* ── Shared bits ─────────────────────────────────────────────────────── */

function Slider({ label, value, display, min, max, step = 1, onChange }: { label: string; value: number; display: string; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <label htmlFor={id} className="font-bold text-muted">
          {label}
        </label>
        <span className="font-mono text-[13px] font-bold text-text">{display}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1.5 h-2 w-full cursor-pointer accent-[var(--color-accent)]" />
    </div>
  );
}

function Choice<T extends string | number>({ label, options, value, onChange, render }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void; render?: (v: T) => string }) {
  return (
    <div role="radiogroup" aria-label={label}>
      <div className="text-[13px] font-bold text-muted">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            role="radio"
            aria-checked={o === value}
            onClick={() => onChange(o)}
            className={cn(
              "press rounded-xl border-2 px-3 py-1.5 text-[13px] font-extrabold",
              o === value ? "border-accent bg-accent-soft text-accent shadow-[0_3px_0_var(--color-accent)]" : "border-line bg-surface text-muted shadow-[0_3px_0_var(--color-line)]",
            )}
          >
            {render ? render(o) : String(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Readout({ tone, children }: { tone: "good" | "warn" | "info"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 px-3 py-2 text-[13px] font-bold",
        tone === "good" && "border-success/30 bg-success/10 text-success-strong",
        tone === "warn" && "border-amber/30 bg-amber-soft text-amber",
        tone === "info" && "border-accent/25 bg-accent-soft text-accent-strong",
      )}
      aria-live="polite"
    >
      {children}
    </div>
  );
}

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-line bg-[#1b1f27]" role="img" aria-label={label}>
      {children}
    </div>
  );
}

/* ── Exposure ────────────────────────────────────────────────────────── */

const APERTURES = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16] as const;
const SHUTTERS = [25, 50, 100, 200, 400, 800] as const;
const ISOS = [100, 200, 400, 800, 1600, 3200, 6400] as const;

function ExposureLab() {
  const t = useT();
  const [a, setA] = useState(3); // f/4
  const [s, setS] = useState(1); // 1/50
  const [i, setI] = useState(2); // ISO 400
  const N = APERTURES[a];
  const stops = Math.log2((4 / N) ** 2) + Math.log2(50 / SHUTTERS[s]) + Math.log2(ISOS[i] / 400);
  const r = Math.round(stops * 10) / 10;
  const blur = Math.max(0, (8 / N) * 2.2 - 0.8);
  const streak = 240 / SHUTTERS[s];
  const noise = Math.max(0, Math.log2(ISOS[i] / 400)) * 0.09;
  const fid = useId().replace(/:/g, "");

  return (
    <div className="space-y-4">
      <Frame label={t("Exposure simulator preview")}>
        <svg viewBox="0 0 320 180" className="block w-full">
          <defs>
            <filter id={`bg${fid}`}>
              <feGaussianBlur stdDeviation={blur} />
            </filter>
            <filter id={`n${fid}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <g filter={`url(#bg${fid})`}>
            <rect width="320" height="180" fill="#9cc4e8" />
            <rect y="110" width="320" height="70" fill="#6b8f5a" />
            {[20, 70, 250, 290].map((x, k) => (
              <g key={x}>
                <rect x={x - 3} y={k % 2 ? 70 : 60} width="6" height="50" fill="#5b4632" />
                <circle cx={x} cy={k % 2 ? 66 : 56} r={k % 2 ? 18 : 22} fill="#3f7a46" />
              </g>
            ))}
            <rect x="180" y="72" width="44" height="40" fill="#d9c7a7" />
            <path d="M176 74 L202 54 L228 74 Z" fill="#a4553c" />
          </g>
          <g>
            <rect x={210 - streak} y="140" width={streak} height="12" rx="6" fill="#ff6b3d" opacity="0.35" />
            <circle cx="210" cy="146" r="7" fill="#ff6b3d" />
          </g>
          <CharacterGroup who="mira" mood={Math.abs(stops) < 0.4 ? "happy" : stops > 0 ? "surprised" : "worried"} transform="translate(96 84) scale(0.44)" />
          <rect width="320" height="180" fill={stops > 0 ? "#fff" : "#000"} opacity={Math.min(0.92, Math.abs(stops) * 0.23)} />
          {noise > 0 && <rect width="320" height="180" filter={`url(#n${fid})`} opacity={noise} />}
        </svg>
      </Frame>
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label={t("Aperture")} value={a} min={0} max={APERTURES.length - 1} display={`f/${N}`} onChange={setA} />
        <Slider label={t("Shutter")} value={s} min={0} max={SHUTTERS.length - 1} display={`1/${SHUTTERS[s]}`} onChange={setS} />
        <Slider label="ISO" value={i} min={0} max={ISOS.length - 1} display={String(ISOS[i])} onChange={setI} />
      </div>
      <Readout tone={Math.abs(r) < 0.4 ? "good" : "warn"}>
        {Math.abs(r) < 0.4
          ? t("Correctly exposed.")
          : r > 0
            ? t("{n} stops over — highlights are burning out.", { n: r })
            : t("{n} stops under — the image is getting muddy.", { n: Math.abs(r) })}{" "}
        <span className="font-semibold opacity-80">{N <= 2.8 ? t("Shallow focus: the background melts.") : N >= 8 ? t("Deep focus: the background is sharp.") : ""}</span>
      </Readout>
    </div>
  );
}

/* ── Lens / field of view ───────────────────────────────────────────── */

const SENSORS = { s35: 24.9, ff: 36 } as const;

function LensLab() {
  const t = useT();
  const [f, setF] = useState(35);
  const [sensor, setSensor] = useState<"s35" | "ff">("s35");
  const w = SENSORS[sensor];
  const fov = 2 * Math.atan(w / (2 * f));
  const deg = Math.round((fov * 180) / Math.PI);
  // Crop of a 600-unit-wide panorama seen from a fixed spot: the widest lens (12 mm FF) sees all of it.
  const maxHalf = Math.atan(36 / 24);
  const cropW = Math.max(40, (600 * Math.tan(fov / 2)) / Math.tan(maxHalf));
  const cropH = cropW * (9 / 16);
  const cx = 300 - cropW / 2;
  const cy = 120 - cropH / 2;
  const kind = deg > 70 ? t("Wide") : deg > 40 ? t("Normal-ish") : deg > 20 ? t("Short telephoto") : t("Telephoto");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Frame label={t("What the lens sees")}>
          <svg viewBox={`${cx} ${cy} ${cropW} ${cropH}`} preserveAspectRatio="xMidYMid slice" className="block aspect-video w-full">
            <rect x="0" y="0" width="600" height="240" fill="#9cc4e8" />
            <rect x="0" y="150" width="600" height="90" fill="#7b9a63" />
            {Array.from({ length: 12 }, (_, k) => (
              <rect key={k} x={k * 52 + 4} y={110 - (k % 3) * 18} width="40" height={40 + (k % 3) * 18} fill={k % 2 ? "#d8cbb3" : "#c3b08f"} />
            ))}
            <CharacterGroup who="leo" mood={f > 90 ? "excited" : "happy"} transform="translate(286 127) scale(0.14)" />
          </svg>
        </Frame>
        <svg viewBox="0 0 140 120" className="hidden w-full rounded-2xl border-2 border-line bg-surface-2 sm:block" aria-hidden>
          <path d={`M70 108 L${70 - 100 * Math.tan(fov / 2)} 8 L${70 + 100 * Math.tan(fov / 2)} 8 Z`} fill="var(--color-accent)" opacity="0.18" stroke="var(--color-accent)" strokeWidth="1.5" />
          <rect x="62" y="104" width="16" height="12" rx="3" fill="var(--color-text)" />
          <text x="70" y="64" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--color-text)">
            {deg}°
          </text>
        </svg>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label={t("Focal length")} value={f} min={12} max={200} display={`${f} mm`} onChange={setF} />
        <Choice label={t("Sensor")} options={["s35", "ff"] as const} value={sensor} onChange={setSensor} render={(v) => (v === "s35" ? "Super 35" : "Full frame")} />
      </div>
      <Readout tone="info">
        {t("{deg}° horizontal field of view — {kind}.", { deg, kind })}{" "}
        {sensor === "s35" && <span className="font-semibold opacity-80">{t("Frames like a {n} mm on full frame.", { n: Math.round(f * 1.45) })}</span>}
      </Readout>
    </div>
  );
}

/* ── Lighting a face ────────────────────────────────────────────────── */

const RATIOS = [1, 2, 4, 8] as const;

function LightingLab() {
  const t = useT();
  const [angle, setAngle] = useState(45);
  const [hard, setHard] = useState(30);
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>(4);
  const [back, setBack] = useState(false);
  const gid = useId().replace(/:/g, "");
  const rad = (angle * Math.PI) / 180;
  const side = Math.sin(rad); // -1 left … +1 right
  const front = Math.cos(rad); // 1 from camera, -1 from behind
  // How dark each side gets: the shadow side by the lighting ratio, everything when lit from behind.
  const shadowDark = ratio === 1 ? 0.05 : Math.min(0.82, 0.2 + Math.log2(ratio) * 0.2);
  const litDark = front < -0.3 ? 0.72 : 0;
  // Where the light/shadow edge falls across the face (0–100 % from the lit side).
  const cut = 50 + (1 - Math.abs(side)) * 50 * Math.max(0, front) - (front < 0 ? 30 : 0);
  const spread = 4 + (100 - hard) * 0.3;
  const a = Math.abs(angle);
  const mood: Mood = a < 35 ? "happy" : a < 115 ? (ratio >= 8 ? "determined" : "neutral") : "thinking";
  const pattern = a < 15 ? t("Flat front light") : a < 35 ? t("Loop lighting") : a < 65 ? t("Rembrandt-style 45°") : a < 115 ? t("Split / side light") : t("Rim / backlight");

  return (
    <div className="space-y-4">
      <Frame label={t("Lighting simulator preview")}>
        <svg viewBox="0 0 320 180" className="block w-full">
          <defs>
            <linearGradient id={`shade${gid}`} x1={side >= 0 ? "100%" : "0%"} x2={side >= 0 ? "0%" : "100%"} y1="0" y2="0">
              <stop offset="0%" stopColor="#000" stopOpacity={litDark} />
              <stop offset={`${Math.max(0, cut - spread)}%`} stopColor="#000" stopOpacity={litDark} />
              <stop offset={`${Math.min(100, cut + spread)}%`} stopColor="#000" stopOpacity={shadowDark} />
              <stop offset="100%" stopColor="#000" stopOpacity={shadowDark} />
            </linearGradient>
          </defs>
          <rect width="320" height="180" fill="#20242c" />
          <clipPath id={`clip${gid}`}>
            <ellipse cx="160" cy="86.5" rx="44" ry="47" />
            <ellipse cx="124" cy="94" rx="8" ry="10" />
            <ellipse cx="196" cy="94" rx="8" ry="10" />
            <path d="M101 180 Q104 142 138 136 L182 136 Q216 142 219 180 Z" />
          </clipPath>
          {front < 0 && (
            <g transform={`translate(${160 + side * 118} ${70 - front * 30})`}>
              <circle r={4 + (100 - hard) / 9} fill="#ffe08a" opacity="0.9" />
            </g>
          )}
          {(back || front < -0.3) && (
            <g fill="none" stroke="#fff4d6" strokeLinecap="round" opacity="0.9">
              <ellipse cx="160" cy="86" rx="47" ry="50" strokeWidth="5" />
              <path d="M104 178 Q106 144 138 137 L182 137 Q214 144 216 178" strokeWidth="4" />
            </g>
          )}
          <CharacterGroup who="zsofi" mood={mood} look={side > 0.3 ? 1 : side < -0.3 ? -1 : 0} transform="translate(81 8) scale(0.78)" />
          <rect x="80" y="0" width="160" height="180" clipPath={`url(#clip${gid})`} fill={`url(#shade${gid})`} />
          {front >= 0 && (
            <g transform={`translate(${160 + side * 118} ${70 - front * 30})`}>
              <circle r={4 + (100 - hard) / 9} fill="#ffe08a" opacity="0.9" />
            </g>
          )}
        </svg>
      </Frame>
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label={t("Key light angle")} value={angle} min={-180} max={180} step={5} display={`${angle}°`} onChange={setAngle} />
        <Slider label={t("Hard ↔ soft")} value={hard} min={0} max={100} display={hard > 60 ? t("Hard") : hard > 30 ? t("Medium") : t("Soft")} onChange={setHard} />
        <Choice label={t("Lighting ratio")} options={RATIOS} value={ratio} onChange={setRatio} render={(v) => `${v}:1`} />
        <Choice label={t("Backlight")} options={["off", "on"] as const} value={back ? "on" : "off"} onChange={(v) => setBack(v === "on")} render={(v) => (v === "on" ? t("On") : t("Off"))} />
      </div>
      <Readout tone="info">
        {pattern} · {ratio === 1 ? t("no contrast") : t("shadow side {n} stops darker", { n: Math.log2(ratio) })}
      </Readout>
    </div>
  );
}

/* ── Colour temperature ─────────────────────────────────────────────── */

const PRESETS = [
  { k: 1900, label: "Candle" },
  { k: 3200, label: "Tungsten" },
  { k: 5600, label: "Daylight" },
  { k: 7500, label: "Shade" },
] as const;

function ColorTempLab() {
  const t = useT();
  const [light, setLight] = useState(3200);
  const [wb, setWb] = useState(5600);
  const shift = 1e6 / light - 1e6 / wb; // mired difference: + = scene looks warmer
  const amount = Math.min(0.55, Math.abs(shift) / 260);
  const tint = shift > 0 ? "#ff8a2a" : "#3a7bff";
  const tone = Math.abs(shift) < 15 ? "good" : "warn";

  return (
    <div className="space-y-4">
      <Frame label={t("White balance simulator preview")}>
        <svg viewBox="0 0 320 180" className="block w-full">
          <rect width="320" height="180" fill="#e9e5df" />
          <rect x="24" y="22" width="92" height="74" fill="#cfe2f5" stroke="#bbb" strokeWidth="3" />
          <rect y="128" width="320" height="52" fill="#b9a58c" />
          <rect x="196" y="96" width="96" height="40" rx="6" fill="#4f6b8a" />
          <rect x="226" y="40" width="8" height="58" fill="#777" />
          <path d="M210 40 L250 40 L240 20 L220 20 Z" fill="#f2efe6" />
          <CharacterGroup who="kai" mood={tone === "good" ? "happy" : shift > 0 ? "neutral" : "worried"} transform="translate(116 84) scale(0.44)" />
          <rect x="40" y="140" width="40" height="26" fill="#ffffff" stroke="#ddd" />
          <text x="60" y="157" textAnchor="middle" fontSize="9" fontWeight="800" fill="#999">
            WHITE
          </text>
          <rect width="320" height="180" fill={tint} opacity={amount} style={{ mixBlendMode: "multiply" }} />
        </svg>
      </Frame>
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label={t("Light source")} value={light} min={1800} max={9000} step={100} display={`${light} K`} onChange={setLight} />
        <Slider label={t("Camera white balance")} value={wb} min={2500} max={9000} step={100} display={`${wb} K`} onChange={setWb} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.k} type="button" onClick={() => setLight(p.k)} className="press rounded-xl border-2 border-line bg-surface px-2.5 py-1 text-xs font-extrabold text-muted shadow-[0_3px_0_var(--color-line)]">
            {t(p.label)} · {p.k} K
          </button>
        ))}
      </div>
      <Readout tone={tone}>
        {tone === "good" ? t("Balanced: whites look white.") : shift > 0 ? t("The light is warmer than the camera expects — the image goes orange.") : t("The light is cooler than the camera expects — the image goes blue.")}
      </Readout>
    </div>
  );
}

/* ── Framing & aspect ratio ─────────────────────────────────────────── */

const ASPECTS = [1.37, 1.85, 2.39] as const;

function FramingLab() {
  const t = useT();
  const [ratio, setRatio] = useState<(typeof ASPECTS)[number]>(1.85);
  const [x, setX] = useState(33);
  const [look, setLook] = useState<"left" | "right">("right");
  const [grid, setGrid] = useState(true);
  const W = 100 * ratio;
  const H = 100;
  const px = (x / 100) * W;
  const room = look === "right" ? W - px : px;
  const open = room > W * 0.45;

  return (
    <div className="space-y-4">
      <div className="flex justify-center rounded-2xl border-2 border-line bg-surface-2 p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="block max-h-56 w-full" style={{ aspectRatio: String(ratio) }} role="img" aria-label={t("Framing preview")}>
          <rect width={W} height={H} fill="#23324a" />
          <rect y={H * 0.66} width={W} height={H * 0.34} fill="#384a66" />
          <CharacterGroup who="noor" mood={open ? "happy" : "worried"} look={look === "right" ? 1 : -1} transform={`translate(${px - 27} ${H - 62}) scale(0.27)`} />
          <path d={`M${px + (look === "right" ? 24 : -24)} ${H - 36} l${look === "right" ? 12 : -12} 0`} stroke="#ffd166" strokeWidth="1.6" strokeDasharray="2 2" />
          {grid && (
            <g stroke="#fff" strokeOpacity="0.45" strokeWidth="0.6">
              <line x1={W / 3} x2={W / 3} y1="0" y2={H} />
              <line x1={(2 * W) / 3} x2={(2 * W) / 3} y1="0" y2={H} />
              <line y1={H / 3} y2={H / 3} x1="0" x2={W} />
              <line y1={(2 * H) / 3} y2={(2 * H) / 3} x1="0" x2={W} />
            </g>
          )}
        </svg>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice label={t("Aspect ratio")} options={ASPECTS} value={ratio} onChange={setRatio} render={(v) => `${v}:1`} />
        <Slider label={t("Subject position")} value={x} min={8} max={92} display={`${x}%`} onChange={setX} />
        <Choice label={t("Looking")} options={["left", "right"] as const} value={look} onChange={setLook} render={(v) => (v === "left" ? t("Left") : t("Right"))} />
        <Choice label={t("Thirds grid")} options={["on", "off"] as const} value={grid ? "on" : "off"} onChange={(v) => setGrid(v === "on")} render={(v) => (v === "on" ? t("On") : t("Off"))} />
      </div>
      <Readout tone={open ? "good" : "warn"}>{open ? t("Open frame: there is room in front of their eyes.") : t("Closed frame: they look into the edge — tense, trapped.")}</Readout>
    </div>
  );
}

const WIDGETS: Record<WidgetKind, () => React.JSX.Element> = {
  exposure: ExposureLab,
  lens: LensLab,
  lighting: LightingLab,
  colortemp: ColorTempLab,
  framing: FramingLab,
};

export function LessonWidget({ kind }: { kind: WidgetKind }) {
  const W = WIDGETS[kind];
  return <W />;
}
