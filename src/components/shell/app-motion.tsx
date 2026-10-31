"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { animate, type AnimationPlaybackControls } from "motion/react";
import { NAV_ITEMS } from "./nav-items";
import { play } from "@/lib/sound";
import { useT } from "@/i18n/client";

/*
 * Phone tab pager. The tab screens sit side by side on one horizontal strip:
 * the page follows your finger 1:1, the neighbouring tab slides in next to it,
 * and on release everything springs onto the next tab (or back). Tapping a tab
 * slides the strip the same way. Desktop keeps a plain fade.
 */

export const TAB_HREFS: string[] = NAV_ITEMS.map((i) => i.href);

export function tabIndex(pathname: string) {
  return TAB_HREFS.findIndex((h) => pathname === h || pathname.startsWith(`${h}/`));
}

// ── Which tab the bar should highlight right now (switches on release, before the page arrives) ──
let navTarget: string | null = null;
const navListeners = new Set<() => void>();
function setNavTarget(href: string | null) {
  navTarget = href;
  navListeners.forEach((l) => l());
}
export function useNavTarget() {
  return useSyncExternalStore(
    (l) => (navListeners.add(l), () => navListeners.delete(l)),
    () => navTarget,
    () => null,
  );
}

// ── Tab taps are handed to the pager so they slide like swipes ──
let tapHandler: ((href: string) => boolean) | null = null;
/** Call from a tab's onClick. Returns true when the pager took over (then prevent the link's default). */
export function slideToTab(href: string): boolean {
  return tapHandler ? tapHandler(href) : false;
}

// ── Last-seen picture of each tab, shown while it slides in ──
const snapshots = new Map<string, string>();

const IGNORE = "input, textarea, select, button[role='slider'], [role='slider'], .react-flow, [data-no-swipe], iframe, [role='dialog']";

function scrollsSideways(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    if ((s.overflowX === "auto" || s.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 2) return true;
  }
  return false;
}

type Preview = { href: string; side: 1 | -1; top: number };

const SPRING = { type: "spring" as const, stiffness: 340, damping: 36, mass: 0.9 };

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const x = useRef(0);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const busy = useRef(false); // a slide is committed and waiting for the new page
  const arrivedBySlide = useRef(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const setX = (v: number) => {
    x.current = v;
    if (track.current) track.current.style.transform = v ? `translate3d(${v}px,0,0)` : "";
  };

  const snap = useCallback(() => {
    const p = pathRef.current;
    if (page.current && TAB_HREFS.includes(p)) snapshots.set(p, page.current.innerHTML.replace(/\s(id|for|aria-labelledby|aria-controls)="[^"]*"/g, ""));
  }, []);

  // Line the incoming tab up with the top of the screen, just under the sticky top bar.
  const previewTop = () => {
    const top = track.current ? track.current.getBoundingClientRect().top : 0;
    const bar = document.querySelector("[data-topbar]")?.getBoundingClientRect().bottom ?? 0;
    return Math.max(0, bar - top);
  };

  // The new page has arrived: drop the preview and park the strip at 0 before paint.
  useLayoutEffect(() => {
    anim.current?.stop();
    setX(0);
    setPreview(null);
    busy.current = false;
    setNavTarget(null);
  }, [pathname]);

  // Keep a fresh picture of this tab for when we slide back to it.
  useEffect(() => {
    const id = setTimeout(snap, 900);
    return () => clearTimeout(id);
  }, [pathname, snap]);

  const commit = useCallback(
    (href: string, side: 1 | -1, velocity = 0) => {
      const w = window.innerWidth;
      busy.current = true;
      arrivedBySlide.current = true;
      setNavTarget(href);
      play("swoosh");
      router.prefetch(href);
      anim.current?.stop();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }
      anim.current = animate(x.current, -side * w, {
        ...SPRING,
        velocity,
        restDelta: 0.5,
        onUpdate: setX,
        onComplete: () => router.push(href),
      });
    },
    [router],
  );

  const cancel = useCallback((velocity = 0) => {
    anim.current?.stop();
    anim.current = animate(x.current, 0, { ...SPRING, velocity, onUpdate: setX, onComplete: () => setPreview(null) });
  }, []);

  // Tab taps slide the strip too.
  useEffect(() => {
    tapHandler = (href) => {
      if (!window.matchMedia("(max-width: 1023px)").matches || busy.current) return false;
      const from = tabIndex(pathRef.current);
      const to = TAB_HREFS.indexOf(href);
      if (from < 0 || to < 0 || from === to) return false;
      snap();
      const side = to > from ? 1 : -1;
      setPreview({ href, side, top: previewTop() });
      commit(href, side);
      return true;
    };
    return () => {
      tapHandler = null;
    };
  }, [commit, snap]);

  // Finger tracking.
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 1023px)");
    let s: { x0: number; y0: number; axis: "x" | "y" | null; ok: boolean; samples: { x: number; t: number }[]; i: number } | null = null;

    const onStart = (e: TouchEvent) => {
      s = null;
      if (!phone.matches || e.touches.length !== 1 || busy.current) return;
      const target = e.target as Element;
      const p = e.touches[0];
      const i = tabIndex(pathRef.current);
      // Screen edges belong to the browser's back/forward gesture.
      const edge = p.clientX < 18 || p.clientX > window.innerWidth - 18;
      if (i < 0 || edge || target.closest(IGNORE) || scrollsSideways(target) || !target.closest("[data-pager]")) return;
      anim.current?.stop();
      s = { x0: p.clientX - x.current, y0: p.clientY, axis: x.current ? "x" : null, ok: true, samples: [{ x: p.clientX, t: performance.now() }], i };
    };

    const onMove = (e: TouchEvent) => {
      if (!s?.ok) return;
      const p = e.touches[0];
      const dx = p.clientX - s.x0;
      const dy = p.clientY - s.y0;
      if (!s.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        s.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
        if (s.axis === "y") return void (s.ok = false);
        snap();
      }
      e.preventDefault(); // we own this gesture now: no vertical scroll while paging
      const side: 1 | -1 = dx < 0 ? 1 : -1;
      const next = TAB_HREFS[s.i + side];
      // Past the first/last tab the strip resists like a rubber band.
      const v = next ? dx : dx * 0.28;
      setX(v);
      setPreview((cur) => (next ? (cur?.href === next ? cur : { href: next, side, top: previewTop() }) : null));
      s.samples.push({ x: p.clientX, t: performance.now() });
      if (s.samples.length > 6) s.samples.shift();
    };

    const onEnd = () => {
      const g = s;
      s = null;
      if (!g?.ok || g.axis !== "x") return;
      const a = g.samples[0];
      const b = g.samples[g.samples.length - 1];
      const vel = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0; // px/s
      const w = window.innerWidth;
      const side: 1 | -1 = x.current < 0 ? 1 : -1;
      const next = TAB_HREFS[g.i + side];
      const flung = Math.abs(vel) > 450 && Math.sign(vel) === -side;
      if (next && (Math.abs(x.current) > w * 0.3 || flung)) commit(next, side, vel);
      else cancel(vel);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [commit, cancel, snap]);

  // Pages reached by sliding are already in place; anything else fades in.
  const slid = arrivedBySlide.current;
  useEffect(() => {
    arrivedBySlide.current = false;
  }, [pathname]);

  const html = preview ? snapshots.get(preview.href) : undefined;
  const item = preview ? NAV_ITEMS.find((n) => n.href === preview.href) : undefined;

  return (
    <div className="overflow-x-clip" data-pager>
      <div ref={track} className="relative will-change-transform">
        <div key={pathname} ref={page} className={slid ? "" : "animate-[pagein_.28s_cubic-bezier(.22,1,.36,1)] motion-reduce:animate-none"}>
          {children}
        </div>
        {preview && (
          <div
            className="pager-preview pointer-events-none absolute w-full overflow-hidden"
            style={{ left: `${preview.side * 100}%`, top: preview.top, height: "100dvh" }}
            aria-hidden
            inert
          >
            {html ? (
              <div dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              item && (
                <div className="px-4 pt-8 sm:px-6">
                  <div className="flex items-center gap-3">
                    <item.icon className="size-9 text-accent" aria-hidden />
                    <span className="font-display text-[2rem] font-black leading-tight">{t(item.label)}</span>
                  </div>
                  <div className="mt-3 h-4 w-3/4 rounded-full bg-surface-3" />
                  <div className="mt-7 space-y-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-32 rounded-3xl border-2 border-line bg-surface-2 shadow-[0_4px_0_var(--color-line)]" />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
