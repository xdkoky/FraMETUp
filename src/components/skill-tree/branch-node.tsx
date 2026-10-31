"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Clock, Crosshair, Link2 } from "lucide-react";
import type { ProficiencyState } from "@/lib/assessment/engine";
import { STATE_STYLE } from "@/lib/skill-state";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type BranchNodeData = {
  name: string;
  state: ProficiencyState;
  mastery: number | null;
  confidence: number;
  color: string;
  external: number;
  goal: boolean;
  recent: boolean;
  reassess: boolean;
  highlight: "selected" | "upstream" | "downstream" | null;
  dim: boolean;
};

const hidden = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 } as const;

/** A readable skill card: name, state, and a five-step level bar. */
export const BranchNode = memo(function BranchNode({ data }: NodeProps<Node<BranchNodeData>>) {
  const t = useT();
  const st = STATE_STYLE[data.state];
  const assessed = data.mastery !== null;
  const steps = assessed ? Math.min(5, Math.max(1, Math.round(((data.mastery as number) - 10) / 20) + 1)) : 0;
  return (
    <div
      className={cn(
        "w-[232px] rounded-2xl border bg-surface px-3.5 py-3 transition-all duration-200",
        data.highlight === "selected" && "border-accent shadow-[0_0_0_1px_var(--color-accent),0_12px_32px_-12px_rgba(47,124,246,0.35)]",
        data.highlight === "upstream" && "border-accent/60",
        data.highlight === "downstream" && "border-amber/60",
        !data.highlight && (assessed ? "border-line" : "border-dashed border-line"),
        data.dim ? "opacity-25" : "opacity-100 hover:-translate-y-0.5 hover:border-faint",
      )}
      aria-label={`${data.name}: ${t(st.label)}`}
    >
      <Handle type="target" position={Position.Left} style={hidden} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={hidden} isConnectable={false} />
      <div className="flex items-start gap-2">
        <span
          className="mt-1 size-2.5 shrink-0 rounded-full"
          style={assessed ? { background: st.color } : { border: `1.5px dashed ${st.color}` }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-text">{data.name}</div>
        {data.goal && <Crosshair className="mt-0.5 size-3.5 shrink-0 text-accent" aria-label={t("In your learning goals")} />}
        {data.reassess && <Clock className="mt-0.5 size-3.5 shrink-0 text-faint" aria-label={t("Could use fresh evidence")} />}
        {data.recent && <span className="mt-1 size-2 shrink-0 rounded-full bg-amber" title={t("Recently strengthened")} />}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: n <= steps ? st.color : "var(--color-surface-3)", opacity: n <= steps ? 0.45 + 0.55 * data.confidence : 1 }}
            />
          ))}
        </div>
        <span className="text-[10.5px] whitespace-nowrap" style={{ color: assessed ? st.color : "var(--color-faint)" }}>
          {t(st.short)}
        </span>
      </div>
      {data.external > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[10.5px] text-faint">
          <Link2 className="size-3" aria-hidden /> {t("{n} links to other areas", { n: data.external })}
        </div>
      )}
    </div>
  );
});

export type ColumnLabelData = { label: string };

export const ColumnLabel = memo(function ColumnLabel({ data }: NodeProps<Node<ColumnLabelData>>) {
  return <div className="slate-label w-[232px] text-center">{data.label}</div>;
});
