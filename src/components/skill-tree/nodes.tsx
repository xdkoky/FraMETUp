"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Clock, Crosshair } from "lucide-react";
import type { ProficiencyState } from "@/lib/assessment/engine";
import { STATE_STYLE } from "@/lib/skill-state";
import { cn } from "@/lib/utils";

const hidden = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0, top: "50%", left: "50%" } as const;

function CenterHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </>
  );
}

export type SkillNodeData = {
  name: string;
  categoryColor: string;
  state: ProficiencyState;
  mastery: number | null;
  confidence: number;
  dim: boolean;
  highlight: "selected" | "upstream" | "downstream" | "related" | null;
  recent: boolean;
  goal: boolean;
  reassess: boolean;
};

const R = 22;
const C = 2 * Math.PI * R;

export const SkillNode = memo(function SkillNode({ data, selected }: NodeProps<Node<SkillNodeData>>) {
  const style = STATE_STYLE[data.state];
  const assessed = data.mastery !== null;
  const pct = assessed ? (data.mastery as number) / 100 : 0;
  const ringOpacity = assessed ? 0.4 + 0.6 * data.confidence : 1;
  const strong = data.state === "STRONGLY_EVIDENCED";
  const hl = data.highlight;
  return (
    <div
      className={cn(
        "group flex w-[132px] flex-col items-center transition-opacity duration-300",
        data.dim ? "opacity-[0.16]" : "opacity-100",
      )}
      aria-label={`${data.name}: ${style.label}`}
    >
      <CenterHandles />
      <div className="relative size-14">
        {strong && <span className="absolute inset-0 rounded-full bg-amber/30 animate-pulse-ring" aria-hidden />}
        {hl === "selected" && <span className="absolute -inset-1.5 rounded-full ring-2 ring-accent/80" aria-hidden />}
        {hl === "upstream" && <span className="absolute -inset-1 rounded-full ring-1 ring-accent/60" aria-hidden />}
        {hl === "downstream" && <span className="absolute -inset-1 rounded-full ring-1 ring-amber/60" aria-hidden />}
        <svg viewBox="0 0 56 56" className="size-14 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
          <circle cx="28" cy="28" r="26" fill="#11151D" stroke={selected ? "#6E9BFF" : "#232A38"} strokeWidth="1" />
          <circle
            cx="28"
            cy="28"
            r={R}
            fill="none"
            stroke={assessed ? "#262D3C" : style.color}
            strokeWidth="3"
            strokeDasharray={assessed ? undefined : "3 4"}
          />
          {assessed && (
            <circle
              cx="28"
              cy="28"
              r={R}
              fill="none"
              stroke={style.color}
              strokeOpacity={ringOpacity}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray={`${C * pct} ${C}`}
              transform="rotate(-90 28 28)"
              className="transition-[stroke-dasharray] duration-700 ease-out"
            />
          )}
          <circle cx="28" cy="28" r={assessed ? 6 : 4} fill={data.categoryColor} fillOpacity={assessed ? 0.95 : 0.45} />
        </svg>
        {data.recent && (
          <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-amber ring-2 ring-ink" title="Recently strengthened" />
        )}
        {data.goal && (
          <span className="absolute -left-1 -top-1 rounded-full bg-ink p-0.5 text-accent" title="In your learning goals">
            <Crosshair className="size-3" aria-hidden />
          </span>
        )}
        {data.reassess && (
          <span className="absolute -left-1 -bottom-1 rounded-full bg-ink p-0.5 text-faint" title="Could use fresh evidence">
            <Clock className="size-3" aria-hidden />
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-1.5 max-w-[132px] text-center text-[11.5px] leading-tight transition-colors",
          hl ? "text-text font-medium" : assessed ? "text-[#C9CFDA]" : "text-faint",
          "group-hover:text-text",
        )}
      >
        {data.name}
      </div>
    </div>
  );
});

export type CategoryNodeData = { code: string; name: string; color: string; dim: boolean; assessed: number; total: number };

export const CategoryNode = memo(function CategoryNode({ data }: NodeProps<Node<CategoryNodeData>>) {
  return (
    <div className={cn("flex flex-col items-center transition-opacity duration-300", data.dim ? "opacity-25" : "opacity-100")}>
      <CenterHandles />
      <div
        className="flex size-[72px] items-center justify-center rounded-2xl border bg-surface font-mono text-xl"
        style={{ borderColor: `${data.color}66`, color: data.color, boxShadow: `0 0 32px ${data.color}22` }}
      >
        {data.code}
      </div>
      <div className="mt-2 w-[150px] text-center text-[12.5px] font-semibold text-text leading-tight">{data.name}</div>
      <div className="font-mono text-[10px] text-faint mt-0.5">
        {data.assessed}/{data.total} assessed
      </div>
    </div>
  );
});

export type CenterNodeData = { name: string; tier: string };

export const CenterNode = memo(function CenterNode({ data }: NodeProps<Node<CenterNodeData>>) {
  return (
    <div className="flex flex-col items-center">
      <CenterHandles />
      <div className="relative flex size-28 items-center justify-center rounded-full border border-line bg-[radial-gradient(circle_at_50%_35%,#1D2330,#0B0D12)]">
        <span className="absolute inset-2 rounded-full border border-dashed border-line-soft" aria-hidden />
        <div className="text-center">
          <div className="slate-label">Director</div>
          <div className="font-display text-lg leading-tight max-w-[96px] truncate">{data.name.split(" ")[0]}</div>
        </div>
      </div>
      <div className="mt-2 font-mono text-[10px] tracking-widest text-amber uppercase">{data.tier}</div>
    </div>
  );
});

export type SectorNodeData = {
  radius: number;
  sectors: { id: string; name: string; color: string; angle: number; dim: boolean }[];
};

/** Faint category wedges + rim labels behind the graph, so each region reads as a territory. */
export const SectorNode = memo(function SectorNode({ data }: NodeProps<Node<SectorNodeData>>) {
  const R = data.radius;
  const size = R * 2;
  const n = data.sectors.length;
  const half = Math.PI / n;
  const inner = 330;
  const arc = (a0: number, a1: number, r: number) => [R + Math.cos(a0) * r, R + Math.sin(a0) * r, R + Math.cos(a1) * r, R + Math.sin(a1) * r];
  return (
    <svg width={size} height={size} className="pointer-events-none overflow-visible" aria-hidden>
      {data.sectors.map((s) => {
        const a0 = s.angle - half + 0.02;
        const a1 = s.angle + half - 0.02;
        const [ox0, oy0, ox1, oy1] = arc(a0, a1, R);
        const [ix1, iy1, ix0, iy0] = arc(a1, a0, inner);
        const labelR = R + 40;
        const lx = R + Math.cos(s.angle) * labelR;
        const ly = R + Math.sin(s.angle) * labelR;
        let rot = (s.angle * 180) / Math.PI + 90;
        if (rot > 90 && rot < 270) rot += 180;
        return (
          <g key={s.id} opacity={s.dim ? 0.25 : 1} style={{ transition: "opacity 300ms" }}>
            <path
              d={`M ${ox0} ${oy0} A ${R} ${R} 0 0 1 ${ox1} ${oy1} L ${ix1} ${iy1} A ${inner} ${inner} 0 0 0 ${ix0} ${iy0} Z`}
              fill={s.color}
              fillOpacity={0.035}
              stroke={s.color}
              strokeOpacity={0.12}
            />
            <text
              x={lx}
              y={ly}
              fill={s.color}
              fillOpacity={0.75}
              fontSize={28}
              letterSpacing={8}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${rot} ${lx} ${ly})`}
              style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase" }}
            >
              {s.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
});
