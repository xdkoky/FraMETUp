import type { ShotStatus } from "@prisma/client";
import { STAGE_LABEL, type Stage } from "@/lib/production/lifecycle";
import { cn } from "@/lib/utils";

export const SHOT_STATUS_STYLE: Record<ShotStatus, { label: string; cls: string; dot: string }> = {
  PLANNED: { label: "Planned", cls: "border-line text-muted bg-surface-2", dot: "bg-faint" },
  PREPARING: { label: "Preparing", cls: "border-amber/40 text-amber bg-amber-soft", dot: "bg-amber-bright" },
  READY: { label: "Ready", cls: "border-accent/40 text-accent bg-accent-soft", dot: "bg-accent" },
  SHOOTING: { label: "Shooting", cls: "border-danger/40 text-danger bg-danger/10", dot: "bg-danger animate-pulse" },
  COMPLETED: { label: "Completed", cls: "border-success/40 text-success-strong bg-success/10", dot: "bg-success" },
  SKIPPED: { label: "Skipped", cls: "border-line text-faint bg-surface-2 line-through", dot: "bg-line-strong" },
  PICKUP: { label: "Needs pickup", cls: "border-[#8B5CF6]/40 text-[#8B5CF6] bg-[#8B5CF6]/10", dot: "bg-[#8B5CF6]" },
};

export function ShotStatusBadge({ status, label }: { status: ShotStatus; label: string }) {
  const s = SHOT_STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border-2 px-2 py-0.5 text-[11px] font-extrabold", s.cls)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {label}
    </span>
  );
}

const STAGE_COLOR: Record<Stage, string> = {
  PRE_PRODUCTION: "#2F7CF6",
  READY: "#14A89A",
  PRODUCTION: "#E5484D",
  WRAPPED: "#F2A100",
  POST_PRODUCTION: "#8B5CF6",
  COMPLETED: "#22A55B",
};

export function StageBadge({ stage, label }: { stage: Stage; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white" style={{ background: STAGE_COLOR[stage] }}>
      {label}
    </span>
  );
}

export { STAGE_LABEL };
