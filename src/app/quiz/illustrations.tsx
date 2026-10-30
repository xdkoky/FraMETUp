"use client";

/** Small SVG illustrations for the visual quiz questions. Decorative text is kept out of the SVGs so they work in any language. */

const INK = "#0B0D12";
const LINE = "#2A3142";
const FIG = "#C9CFDA";
const ACCENT = "#6E9BFF";
const AMBER = "#E8B04B";

function Person({ x, y, s = 1, color = FIG }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-14" r="6" fill={color} />
      <path d="M-8 6 Q0 -10 8 6 Z" fill={color} />
    </g>
  );
}

export function FrameIllustration({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full rounded-lg" aria-hidden>
      <rect width="160" height="90" fill="#141823" />
      {id === "crowd" && (
        <>
          {[18, 36, 54, 106, 124, 142, 28, 132, 46, 114].map((x, i) => (
            <Person key={i} x={x} y={i > 5 ? 84 : 74} s={i > 5 ? 1.15 : 0.95} color="#4A5263" />
          ))}
          <Person x={80} y={78} s={1.4} color={AMBER} />
        </>
      )}
      {id === "space" && (
        <>
          <line x1="0" y1="66" x2="160" y2="66" stroke={LINE} />
          <Person x={128} y={64} s={0.55} color={AMBER} />
        </>
      )}
      {id === "closeup" && (
        <>
          <circle cx="80" cy="46" r="30" fill={AMBER} opacity="0.9" />
          <path d="M40 90 Q80 60 120 90 Z" fill={AMBER} opacity="0.75" />
          <circle cx="70" cy="42" r="2.5" fill={INK} />
          <circle cx="90" cy="42" r="2.5" fill={INK} />
        </>
      )}
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
          <stop offset="0%" stopColor="#F2C27A" />
          <stop offset="70%" stopColor="#2A2016" />
        </linearGradient>
        <radialGradient id={`${gid}-b`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#E9EEF8" />
          <stop offset="100%" stopColor="#6B7385" />
        </radialGradient>
      </defs>
      {id === "flat" && (
        <>
          <rect width="160" height="90" fill="#C7CDD8" />
          <circle cx="80" cy="40" r="16" fill="#E7D3BE" />
          <path d="M54 90 Q80 54 106 90 Z" fill="#9AA3B2" />
        </>
      )}
      {id === "practical" && (
        <>
          <rect width="160" height="90" fill={`url(#${gid}-p)`} />
          <path d="M18 30 h14 l-4 -10 h-6 z" fill="#F2C27A" />
          <line x1="25" y1="30" x2="25" y2="62" stroke="#6B5537" strokeWidth="2" />
          <circle cx="86" cy="40" r="16" fill={`url(#${gid}-face)`} />
          <path d="M60 90 Q86 54 112 90 Z" fill="#2A2016" />
        </>
      )}
      {id === "silhouette" && (
        <>
          <rect width="160" height="90" fill={`url(#${gid}-b)`} />
          <circle cx="80" cy="40" r="16" fill="#151821" />
          <path d="M54 90 Q80 54 106 90 Z" fill="#151821" />
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
      <rect x="4" y="4" width="292" height="222" rx="14" fill="#11151D" stroke={LINE} />
      {selected && <path d={cams.find((c) => c.id === selected)!.cone} fill={ACCENT} opacity="0.12" />}
      <rect x="120" y="95" width="60" height="50" rx="6" fill="#1D2330" stroke={LINE} />
      <g>
        <circle cx="95" cy="120" r="16" fill="#262D3C" stroke={FIG} />
        <text x="95" y="125" textAnchor="middle" fontSize="13" fill={FIG} fontFamily="var(--font-mono)">D</text>
      </g>
      <g>
        <circle cx="205" cy="120" r="16" fill="#262D3C" stroke={AMBER} />
        <text x="205" y="125" textAnchor="middle" fontSize="13" fill={AMBER} fontFamily="var(--font-mono)">S</text>
      </g>
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
            <circle cx={c.x} cy={c.y} r="20" fill={on ? ACCENT : "#1D2330"} stroke={on ? ACCENT : "#4A5263"} strokeWidth="1.5" />
            <g transform={`translate(${c.x} ${c.y}) rotate(${c.rot})`}>
              <rect x="-9" y="-6" width="12" height="12" rx="2" fill={on ? INK : FIG} />
              <path d="M3 -4 L10 -8 L10 8 L3 4 Z" fill={on ? INK : FIG} />
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
  const color = who === "A" ? AMBER : ACCENT;
  return (
    <svg viewBox="0 0 160 90" className="h-full w-full rounded-lg" aria-hidden>
      <rect width="160" height="90" fill="#141823" />
      <circle cx={x} cy="40" r="15" fill={color} opacity="0.9" />
      <path d={`M${x - 26} 90 Q${x} 52 ${x + 26} 90 Z`} fill={color} opacity="0.7" />
      <circle cx={x + dir * 7} cy="37" r="2.4" fill={INK} />
      <line x1={x + dir * 20} y1="40" x2={x + dir * 52} y2="40" stroke={FIG} strokeWidth="2" strokeDasharray="4 4" />
      <path d={`M${x + dir * 52} 40 l${-dir * 8} -5 v10 z`} fill={FIG} />
      <text x={facing === "right" ? 14 : 146} y="18" textAnchor="middle" fontSize="13" fill={FIG} fontFamily="var(--font-mono)">
        {who}
      </text>
    </svg>
  );
}
