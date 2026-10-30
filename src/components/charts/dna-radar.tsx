"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

export interface DnaPoint {
  category: string;
  code: string;
  current: number | null;
  compare?: number | null;
  coverage: number;
}

function TooltipBody({ active, payload }: { active?: boolean; payload?: Array<{ payload: DnaPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="font-medium text-text">{p.category}</div>
      <div className="mt-1 text-muted">{p.current === null ? "No assessed skills yet" : `Evidence-weighted estimate: ${Math.round(p.current)}/100`}</div>
      {p.compare !== undefined && <div className="text-amber">Earlier: {p.compare === null ? "no evidence" : Math.round(p.compare)}</div>}
      <div className="text-faint">{Math.round(p.coverage * 100)}% of skills have evidence</div>
    </div>
  );
}

export function DnaRadar({ data, compareLabel, height = 320 }: { data: DnaPoint[]; compareLabel?: string; height?: number }) {
  const rows = data.map((d) => ({ ...d, currentV: d.current ?? 0, compareV: d.compare ?? 0 }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke="#2A3142" />
          <PolarAngleAxis
            dataKey="category"
            tick={({ x, y, payload, textAnchor }) => {
              const d = rows.find((r) => r.category === payload.value)!;
              return (
                <text x={x} y={y} textAnchor={textAnchor} fill={d.current === null ? "#6B7385" : "#C9CFDA"} fontSize={11}>
                  {d.code} · {payload.value}
                  {d.current === null ? " ·  —" : ""}
                </text>
              );
            }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {compareLabel && (
            <Radar name={compareLabel} dataKey="compareV" stroke="#E8B04B" fill="#E8B04B" fillOpacity={0.08} strokeDasharray="4 4" isAnimationActive />
          )}
          <Radar name="Now" dataKey="currentV" stroke="#6E9BFF" fill="#6E9BFF" fillOpacity={0.22} isAnimationActive />
          <Tooltip content={<TooltipBody />} />
          {compareLabel && <Legend wrapperStyle={{ fontSize: 12, color: "#9BA4B5" }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
