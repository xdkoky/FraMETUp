import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardHeader({
  title,
  eyebrow,
  action,
  className,
}: {
  title: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="slate-label mb-1">{eyebrow}</div>}
        <h2 className="text-[15px] font-semibold text-text">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
  style,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "amber" | "success" | "danger" | "outline";
  className?: string;
  style?: React.CSSProperties;
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted border-line",
    accent: "bg-accent-soft text-accent-strong border-accent/25",
    amber: "bg-amber-soft text-amber border-amber/25",
    success: "bg-success/10 text-success border-success/25",
    danger: "bg-danger/10 text-danger border-danger/25",
    outline: "bg-transparent text-muted border-line border-dashed",
  };
  return (
    <span
      style={style}
      className={cn("inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[11px] font-extrabold leading-4", tones[tone], className)}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="slate-label mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[2.1rem] md:text-[2.7rem] font-black leading-[1.08] tracking-tight text-text">{title}</h1>
        {description && <p className="mt-3 text-muted leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center px-6 py-10 rounded-2xl border-2 border-dashed border-line", className)}>
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {children && <p className="mt-1.5 text-sm text-muted max-w-sm leading-relaxed">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Meter({
  value,
  max = 100,
  color = "var(--color-accent)",
  className,
  label,
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-2.5 w-full rounded-full bg-surface-3 overflow-hidden", className)}
    >
      <div className="relative h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: color }}>
        <span className="absolute inset-x-1.5 top-[3px] h-[3px] rounded-full bg-white/35" aria-hidden />
      </div>
    </div>
  );
}

export function DemoBanner({ children }: { children: React.ReactNode }) {
  return <div className="border-b-2 border-amber/20 bg-amber-soft text-amber text-xs font-bold px-4 py-1.5 text-center">{children}</div>;
}
