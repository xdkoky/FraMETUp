import { cn } from "@/lib/utils";

export const BRAND = "FraMETUp";

/** Wordmark: Fra·METU·p — the METU in the middle carries the accent. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono text-[14px] tracking-[0.12em] text-text", className)} aria-label={BRAND}>
      <span aria-hidden>Fra</span>
      <span aria-hidden className="text-accent">METU</span>
      <span aria-hidden>p</span>
    </span>
  );
}
