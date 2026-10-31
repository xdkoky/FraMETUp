import { cn } from "@/lib/utils";

export const BRAND = "FraMETUp";

/** Four viewfinder corner marks drawn around their parent. */
function FrameCorners() {
  const c = "absolute size-[0.32em] border-current";
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-x-[0.12em] -inset-y-[0.1em] text-accent">
      <span className={cn(c, "left-0 top-0 rounded-tl-[0.08em] border-l-[0.09em] border-t-[0.09em]")} />
      <span className={cn(c, "right-0 top-0 rounded-tr-[0.08em] border-r-[0.09em] border-t-[0.09em]")} />
      <span className={cn(c, "bottom-0 left-0 rounded-bl-[0.08em] border-b-[0.09em] border-l-[0.09em]")} />
      <span className={cn(c, "bottom-0 right-0 rounded-br-[0.08em] border-b-[0.09em] border-r-[0.09em]")} />
    </span>
  );
}

/**
 * Wordmark: "Fra[METU]p". METU — the university — sits inside viewfinder corner marks,
 * so it is literally framed. The tagline spells out the pun: fra-ME i-T U-p → "frame it up".
 */
export function Wordmark({ className, tagline = true }: { className?: string; tagline?: boolean }) {
  return (
    <span className={cn("inline-flex flex-col leading-none text-[20px]", className)} aria-label={`${BRAND} — frame it up`} role="img">
      <span aria-hidden className="flex items-baseline font-display font-black tracking-[-0.01em] text-text">
        <span>Fra</span>
        <span className="relative mx-[0.16em] px-[0.06em] text-accent">
          METU
          <FrameCorners />
        </span>
        <span>p</span>
      </span>
      {tagline && (
        <span aria-hidden className="mt-[0.42em] text-[0.5em] font-extrabold lowercase tracking-[0.18em] text-faint">
          fra<b className="font-black text-accent">me</b> i<b className="font-black text-accent">t</b> <b className="font-black text-accent">u</b>p
        </span>
      )}
    </span>
  );
}
