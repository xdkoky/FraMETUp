"use client";

/** Small SVG illustrations for the visual quiz questions. Decorative text is kept out of the SVGs so they work in any language. */

import { CharacterGroup, type CharacterId } from "@/components/characters/character";

const INK = "#1B1F27";
const LINE = "var(--color-line-strong)";
const FIG = "var(--color-muted)";
const ACCENT = "var(--color-accent)";
const AMBER = "var(--color-amber-bright)";
const CROWD: CharacterId[] = ["leo", "kai", "noor", "mira", "leo", "noor", "kai", "mira", "noor", "kai"];

/** Places a 200×220 character so its feet sit at (x, y) with the given height. */
function Cast({ who, x, y, h, mood = "neutral", look = 0, dim = false }: { who: CharacterId; x: number; y: number; h: number; mood?: Parameters<typeof CharacterGroup>[0]["mood"]; look?: number; dim?: boolean }) {
  const s = h / 220;
  return (
    <g style={dim ? { filter: "saturate(0.35) brightness(0.7)" } : undefined}>
      <CharacterGroup who={who} mood={mood} look={look} transform={`translate(${x - 100 * s} ${y - h}) scale(${s})`} />
    </g>
  );
}

export function FrameIllustration({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full rounded-lg" aria-hidden>
      <rect width="160" height="90" fill="#2A3348" />
      {id === "crowd" && (
        <>
          <rect y="60" width="160" height="30" fill="#36415A" />
          {[18, 36, 54, 106, 124, 142].map((x, i) => (
            <Cast key={x} who={CROWD[i]} x={x} y={80} h={34} dim />
          ))}
          {[28, 132, 46, 114].map((x, i) => (
            <Cast key={x} who={CROWD[i + 6]} x={x} y={94} h={40} dim />
          ))}
          <Cast who="zsofi" x={80} y={96} h={58} mood="surprised" />
        </>
      )}
      {id === "space" && (
        <>
          <rect y="66" width="160" height="24" fill="#36415A" />
          <Cast who="zsofi" x={128} y={68} h={22} mood="sad" />
        </>
      )}
      {id === "closeup" && <Cast who="zsofi" x={80} y={150} h={160} mood="sad" />}
    </svg>
  );
}

export function LightIllustration({ id }: { id: string }) {
  const gid = `g-${id}`;
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full rounded-lg" aria-hidden>
      <defs>
        <radialGradient id={`${gid}-p`} cx="15%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#F2C27A" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#3A2A18" stopOpacity="0.5" />
          <stop offset="100%" stopColor={INK} />
        </radialGradient>
        <linearGradient id={`${gid}-face`} x1="0" x2="1">
          <stop offset="0%" stopColor="#FFE2B0" stopOpacity="0.2" />
          <stop offset="55%" stopColor="#7A5530" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#120C08" />
        </linearGradient>
        <radialGradient id={`${gid}-b`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#E9EEF8" />
          <stop offset="100%" stopColor="#6B7385" />
        </radialGradient>
      </defs>
      {id === "flat" && (
        <>
          <rect width="160" height="90" fill="#C7CDD8" />
          <Cast who="leo" x={80} y={96} h={76} mood="happy" />
        </>
      )}
      {id === "practical" && (
        <>
          <rect width="160" height="90" fill={`url(#${gid}-p)`} />
          <path d="M18 30 h14 l-4 -10 h-6 z" fill="#F2C27A" />
          <line x1="25" y1="30" x2="25" y2="62" stroke="#6B5537" strokeWidth="2" />
          <Cast who="leo" x={88} y={96} h={76} mood="thinking" look={-1} />
          <rect x="40" width="120" height="90" fill={`url(#${gid}-face)`} style={{ mixBlendMode: "multiply" }} />
        </>
      )}
      {id === "silhouette" && (
        <>
          <rect width="160" height="90" fill={`url(#${gid}-b)`} />
          <g style={{ filter: "brightness(0.06)" }}>
            <Cast who="leo" x={80} y={96} h={76} />
          </g>
        </>
      )}
    </svg>
  );
}

/** Top-down floor plan of an interrogation; camera positions are buttons rendered by the parent. */
export function FloorPlan({ selected, onSelect, labels }: { selected?: string; onSelect: (id: string) => void; labels: Record<string, string> }) {
  const cams = [
    { id: "over-suspect", x: 262, y: 120, rot: 180, cone: "M262 120 L120 70 L120 170 Z" },
    { id: "side", x: 170, y: 30, rot: 90, cone: "M170 30 L100 150 L240 150 Z" },
    { id: "over-detective", x: 38, y: 120, rot: 0, cone: "M38 120 L180 70 L180 170 Z" },
  ];
  return (
    <svg viewBox="0 0 300 230" className="w-full max-w-md mx-auto" role="group" aria-label={labels.title}>
      <rect x="4" y="4" width="292" height="222" rx="14" fill="var(--color-surface-2)" stroke={LINE} strokeWidth="2" />
      {selected && <path d={cams.find((c) => c.id === selected)!.cone} fill={ACCENT} opacity="0.12" />}
      <rect x="120" y="95" width="60" height="50" rx="6" fill="#D8C3A5" stroke="#B89C78" strokeWidth="2" />
      <defs>
        <clipPath id="fp-d"><circle cx="95" cy="120" r="17" /></clipPath>
        <clipPath id="fp-s"><circle cx="205" cy="120" r="17" /></clipPath>
      </defs>
      <circle cx="95" cy="120" r="19" fill="#fff" stroke={FIG} strokeWidth="2" />
      <g clipPath="url(#fp-d)">
        <CharacterGroup who="leo" mood="determined" look={1} transform="translate(69.5 92) scale(0.255)" />
      </g>
      <text x="95" y="152" textAnchor="middle" fontSize="12" fontWeight="800" fill={FIG}>D</text>
      <circle cx="205" cy="120" r="19" fill="#fff" stroke={AMBER} strokeWidth="2" />
      <g clipPath="url(#fp-s)">
        <CharacterGroup who="kai" mood="worried" look={-1} transform="translate(179.5 92) scale(0.255)" />
      </g>
      <text x="205" y="152" textAnchor="middle" fontSize="12" fontWeight="800" fill={AMBER}>S</text>
      {cams.map((c) => {
        const on = selected === c.id;
        return (
          <g
            key={c.id}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={labels[c.id]}
            onClick={() => onSelect(c.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(c.id);
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[3]"
          >
            <circle cx={c.x} cy={c.y} r="20" fill={on ? ACCENT : "#fff"} stroke={on ? ACCENT : LINE} strokeWidth="2" />
            <g transform={`translate(${c.x} ${c.y}) rotate(${c.rot})`}>
              <rect x="-9" y="-6" width="12" height="12" rx="2" fill={on ? "#fff" : FIG} />
              <path d="M3 -4 L10 -8 L10 8 L3 4 Z" fill={on ? "#fff" : FIG} />
            </g>
            <circle cx={c.x} cy={c.y} r="26" fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

/** One storyboard panel: a character with an eyeline arrow. */
export function ShotPanel({ who, facing }: { who: "A" | "B"; facing: "left" | "right" }) {
  const x = facing === "right" ? 56 : 104;
  const dir = facing === "right" ? 1 : -1;
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full rounded-lg" aria-hidden>
      <rect width="160" height="90" fill="#2A3348" />
      <Cast who={who === "A" ? "mira" : "leo"} x={x} y={100} h={92} mood={who === "A" ? "worried" : "determined"} look={dir} />
      <line x1={x + dir * 30} y1="40" x2={x + dir * 56} y2="40" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeDasharray="4 4" />
      <path d={`M${x + dir * 56} 40 l${-dir * 8} -5 v10 z`} fill="#fff" fillOpacity="0.7" />
      <text x={facing === "right" ? 146 : 14} y="18" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">
        {who}
      </text>
    </svg>
  );
}
