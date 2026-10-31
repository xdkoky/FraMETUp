/**
 * The FraMETUp crew — an original cast drawn as flat vector busts.
 * Each can show eight moods; `look` shifts the pupils left (-1) or right (1).
 */
export type CharacterId = "mira" | "leo" | "zsofi" | "kai" | "noor";
export type Mood = "happy" | "excited" | "neutral" | "thinking" | "surprised" | "worried" | "sad" | "determined";

interface Look {
  skin: string;
  skinShade: string;
  hair: string;
  shirt: string;
  shirtShade: string;
  accent: string;
}

const CAST: Record<CharacterId, Look & { name: string; role: string }> = {
  mira: { name: "Mira", role: "Director", skin: "#F5C9A6", skinShade: "#E5AE86", hair: "#2B1D16", shirt: "#FFB020", shirtShade: "#E08A00", accent: "#2F7CF6" },
  leo: { name: "Leo", role: "Cinematographer", skin: "#C98B5E", skinShade: "#B07448", hair: "#1E1611", shirt: "#2F7CF6", shirtShade: "#1C5FD0", accent: "#E5484D" },
  zsofi: { name: "Zsófi", role: "Actor", skin: "#FBD9C2", skinShade: "#EDBFA1", hair: "#D9542B", shirt: "#8B5CF6", shirtShade: "#6D3FE0", accent: "#FFB020" },
  kai: { name: "Kai", role: "Sound", skin: "#8D5A3B", skinShade: "#764A2F", hair: "#120D0A", shirt: "#14A89A", shirtShade: "#0D7A70", accent: "#22A55B" },
  noor: { name: "Noor", role: "Gaffer", skin: "#E2A982", skinShade: "#CC9068", hair: "#1E1611", shirt: "#F27522", shirtShade: "#C95A10", accent: "#E0479E" },
};

export const CHARACTER_INFO = CAST;

const EYE_L = 80;
const EYE_R = 120;
const EYE_Y = 100;

function Eyes({ mood, look }: { mood: Mood; look: number }) {
  const ink = "#2B2320";
  if (mood === "excited") {
    // Happy closed eyes: ^ ^
    return (
      <g fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round">
        <path d={`M${EYE_L - 9} ${EYE_Y + 3} Q${EYE_L} ${EYE_Y - 9} ${EYE_L + 9} ${EYE_Y + 3}`} />
        <path d={`M${EYE_R - 9} ${EYE_Y + 3} Q${EYE_R} ${EYE_Y - 9} ${EYE_R + 9} ${EYE_Y + 3}`} />
      </g>
    );
  }
  const big = mood === "surprised";
  const rx = big ? 9.5 : 8;
  const ry = big ? 11.5 : mood === "determined" ? 7 : 9.5;
  const dx = look * 3 + (mood === "thinking" ? 3 : 0);
  const dy = mood === "thinking" ? -3 : mood === "sad" ? 2 : 0;
  return (
    <g>
      {[EYE_L, EYE_R].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={EYE_Y} rx={rx} ry={ry} fill="#fff" />
          <ellipse cx={x + dx} cy={EYE_Y + dy + 1} rx={rx * 0.62} ry={ry * 0.66} fill={ink} />
          <circle cx={x + dx + 2.2} cy={EYE_Y + dy - 2.5} r="2.2" fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Brows({ mood, color }: { mood: Mood; color: string }) {
  // [left inner y, left outer y, right inner y, right outer y]
  const shapes: Record<Mood, [number, number, number, number]> = {
    happy: [80, 80, 80, 80],
    excited: [77, 79, 77, 79],
    neutral: [82, 82, 82, 82],
    thinking: [82, 82, 76, 79],
    surprised: [74, 76, 74, 76],
    worried: [77, 83, 77, 83],
    sad: [78, 84, 78, 84],
    determined: [86, 79, 86, 79],
  };
  const [li, lo, ri, ro] = shapes[mood];
  return (
    <g stroke={color} strokeWidth="5" strokeLinecap="round" fill="none">
      <path d={`M${EYE_L - 10} ${lo} Q${EYE_L} ${Math.min(li, lo) - 3} ${EYE_L + 9} ${li}`} />
      <path d={`M${EYE_R - 9} ${ri} Q${EYE_R} ${Math.min(ri, ro) - 3} ${EYE_R + 10} ${ro}`} />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  const ink = "#5A2420";
  switch (mood) {
    case "happy":
      return (
        <g>
          <path d="M86 124 Q100 140 114 124 Z" fill={ink} />
          <path d="M92 131 Q100 137 108 131 Q100 128 92 131 Z" fill="#F07A7A" />
        </g>
      );
    case "excited":
      return (
        <g>
          <path d="M82 121 Q100 148 118 121 Z" fill={ink} />
          <path d="M86 122 L114 122 L112 126 L88 126 Z" fill="#fff" />
          <path d="M90 136 Q100 143 110 136 Q100 131 90 136 Z" fill="#F07A7A" />
        </g>
      );
    case "surprised":
      return <ellipse cx="100" cy="130" rx="7" ry="9" fill={ink} />;
    case "thinking":
      return <path d="M92 130 Q98 127 104 130 T112 129" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />;
    case "worried":
      return <path d="M88 132 Q94 127 100 131 Q106 135 112 130" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />;
    case "sad":
      return <path d="M89 134 Q100 124 111 134" fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />;
    case "determined":
      return <path d="M89 129 Q100 132 112 126" fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />;
    default:
      return <path d="M91 129 Q100 133 109 129" fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />;
  }
}

/** Hair and headwear drawn behind the head. */
function HairBack({ who, c }: { who: CharacterId; c: Look }) {
  switch (who) {
    case "mira":
      return (
        <g fill={c.hair}>
          {[
            [52, 92, 20],
            [148, 92, 20],
            [56, 118, 16],
            [144, 118, 16],
            [62, 62, 22],
            [138, 62, 22],
          ].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "zsofi":
      return <path d="M44 90 Q40 40 100 34 Q160 40 156 90 L164 176 Q150 190 132 178 L130 120 L70 120 L68 178 Q50 190 36 176 Z" fill={c.hair} />;
    case "noor":
      return <path d="M36 104 Q34 30 100 28 Q166 30 164 104 L170 176 L30 176 Z" fill={c.accent} />;
    default:
      return null;
  }
}

/** Hair, headwear and accessories drawn over the head. */
function HairFront({ who, c }: { who: CharacterId; c: Look }) {
  switch (who) {
    case "mira":
      return (
        <g>
          <g fill={c.hair}>
            {[
              [70, 50, 18],
              [92, 42, 19],
              [114, 44, 18],
              [134, 54, 16],
              [56, 70, 14],
              [146, 72, 13],
            ].map(([x, y, r]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
            ))}
          </g>
          <g fill="none" stroke={c.accent} strokeWidth="4">
            <circle cx={EYE_L} cy={EYE_Y} r="15" />
            <circle cx={EYE_R} cy={EYE_Y} r="15" />
            <path d={`M${EYE_L + 15} ${EYE_Y} Q100 ${EYE_Y - 5} ${EYE_R - 15} ${EYE_Y}`} />
          </g>
        </g>
      );
    case "leo":
      return (
        <g>
          {/* backwards cap */}
          <path d="M46 78 Q48 34 100 32 Q152 34 154 78 Q100 66 46 78 Z" fill={c.accent} />
          <path d="M138 66 Q170 70 176 84 Q160 86 146 78 Z" fill={c.accent} style={{ filter: "brightness(0.85)" }} />
          <rect x="94" y="34" width="12" height="7" rx="3" fill="#fff" opacity="0.6" />
        </g>
      );
    case "zsofi":
      return (
        <g fill={c.hair}>
          <path d="M44 92 Q46 38 100 36 Q154 38 156 92 Q148 64 124 58 Q118 74 92 76 Q100 66 98 58 Q70 60 56 88 Z" />
          <circle cx="146" cy="50" r="10" fill={c.accent} />
        </g>
      );
    case "kai":
      return (
        <g>
          <path d="M46 84 Q42 26 100 24 Q158 26 154 84 Q150 58 128 52 Q100 46 72 52 Q50 58 46 84 Z" fill={c.hair} />
          {/* headphones */}
          <path d="M44 96 Q40 22 100 20 Q160 22 156 96" fill="none" stroke="#2F3542" strokeWidth="9" strokeLinecap="round" />
          <rect x="30" y="86" width="22" height="36" rx="10" fill={c.accent} />
          <rect x="148" y="86" width="22" height="36" rx="10" fill={c.accent} />
          <rect x="35" y="92" width="8" height="24" rx="4" fill="#fff" opacity="0.35" />
        </g>
      );
    case "noor":
      return (
        <g>
          <path d="M44 100 Q44 40 100 38 Q156 40 156 100 Q152 62 100 58 Q48 62 44 100 Z" fill={c.accent} />
          <path d={`M46 96 Q52 50 100 46`} fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" />
          {/* gaffer's work gloves tucked in the collar */}
          <rect x="120" y="182" width="22" height="12" rx="5" fill="#FFD27A" />
        </g>
      );
    default:
      return null;
  }
}

/** The character as an SVG group in a 200 × 220 box — embeddable in any scene. */
export function CharacterGroup({ who, mood = "happy", look = 0, transform }: { who: CharacterId; mood?: Mood; look?: number; transform?: string }) {
  const c = CAST[who];
  const blush = mood === "happy" || mood === "excited";
  return (
    <g transform={transform}>
      <HairBack who={who} c={c} />
      {/* shoulders */}
      <path d="M26 220 Q30 172 74 164 L126 164 Q170 172 174 220 Z" fill={c.shirt} />
      <path d="M26 220 Q30 190 50 178 Q44 200 46 220 Z" fill={c.shirtShade} />
      <rect x="86" y="140" width="28" height="30" rx="10" fill={c.skinShade} />
      <path d="M78 164 Q100 184 122 164 Z" fill={c.skinShade} />
      {/* ears + head */}
      {who !== "noor" && (
        <>
          <ellipse cx="45" cy="104" rx="10" ry="13" fill={c.skin} />
          <ellipse cx="155" cy="104" rx="10" ry="13" fill={c.skin} />
        </>
      )}
      <ellipse cx="100" cy="98" rx="56" ry="60" fill={c.skin} />
      <path d="M146 70 Q160 110 132 150 Q156 116 146 70 Z" fill={c.skinShade} opacity="0.6" />
      {blush && (
        <g fill="#FF8A8A" opacity="0.45">
          <ellipse cx="66" cy="118" rx="9" ry="5.5" />
          <ellipse cx="134" cy="118" rx="9" ry="5.5" />
        </g>
      )}
      <Eyes mood={mood} look={look} />
      <Brows mood={mood} color={c.hair} />
      <path d="M97 106 Q100 114 104 111" fill="none" stroke={c.skinShade} strokeWidth="4" strokeLinecap="round" />
      {who === "leo" && (
        <g fill="#4A3326">
          <path d="M50 104 Q52 162 100 166 Q148 162 150 104 Q146 136 124 142 Q112 138 100 140 Q88 138 76 142 Q54 136 50 104 Z" />
          <path d="M84 121 Q100 112 116 121 Q108 124 100 121 Q92 124 84 121 Z" />
        </g>
      )}
      <Mouth mood={mood} />
      {mood === "worried" && <path d="M150 74 Q156 84 150 88 Q144 84 150 74 Z" fill="#7CC4F8" />}
      {mood === "sad" && <path d="M71 112 Q74 122 70 126 Q66 122 71 112 Z" fill="#7CC4F8" />}
      <HairFront who={who} c={c} />
    </g>
  );
}

/** A standalone character illustration. */
export function Character({
  who,
  mood = "happy",
  look = 0,
  className,
  title,
}: {
  who: CharacterId;
  mood?: Mood;
  look?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg viewBox="0 0 200 220" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <CharacterGroup who={who} mood={mood} look={look} />
    </svg>
  );
}

/** Pick a stable cast member for any string (e.g. a lesson id). */
export function characterFor(key: string): CharacterId {
  const ids: CharacterId[] = ["mira", "leo", "zsofi", "kai", "noor"];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ids[h % ids.length];
}
