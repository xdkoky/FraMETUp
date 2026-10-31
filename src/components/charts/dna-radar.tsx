"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useT } from "@/i18n/client";

export interface DnaPoint {
  category: string;
  code: string;
  current: number | null;
  compare?: number | null;
  coverage: number;
}

function TooltipBody({ active, payload }: { active?: boolean; payload?: Array<{ payload: DnaPoint }> }) {
  const t = useT();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="font-medium text-text">{p.category}</div>
      <div className="mt-1 text-muted">{p.current === null ? t("No assessed skills yet") : t("Evidence-weighted estimate: {n}/100", { n: Math.round(p.current) })}</div>
      {p.compare !== undefined && <div className="text-amber">{t("Earlier:")}{" "}{p.compare === null ? t("no evidence") : Math.round(p.compare)}</div>}
      <div className="text-faint">{Math.round(p.coverage * 100)}{t("% of skills have evidence")}</div>
    </div>
  );
}

export function DnaRadar({ data, compareLabel, height = 320 }: { data: DnaPoint[]; compareLabel?: string; height?: number }) {
  const rows = data.map((d) => ({ ...d, currentV: d.current ?? 0, compareV: d.compare ?? 0 }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke="var(--color-line-strong)" />
          <PolarAngleAxis
            dataKey="category"
            tick={({ x, y, payload, textAnchor }) => {
              const d = rows.find((r) => r.category === payload.value)!;
              return (
                <text x={x} y={y} textAnchor={textAnchor} fill={d.current === null ? "var(--color-faint)" : "var(--color-text)"} fontSize={11}>
                  {d.code} · {payload.value}
                  {d.current === null ? " ·  —" : ""}
                </text>
              );
            }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {compareLabel && (
            <Radar name={compareLabel} dataKey="compareV" stroke="var(--color-amber-bright)" fill="var(--color-amber-bright)" fillOpacity={0.08} strokeDasharray="4 4" isAnimationActive />
          )}
          <Radar name="Now" dataKey="currentV" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.22} isAnimationActive />
          <Tooltip content={<TooltipBody />} />
          {compareLabel && <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-faint)" }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
