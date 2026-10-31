"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { NAV_ITEMS } from "./nav-items";
import { play } from "@/lib/sound";

/** Which way the next page should slide in. Set by tab taps and swipes; read once by the next page. */
let pendingDirection: "left" | "right" | null = null;

export const TAB_HREFS: string[] = NAV_ITEMS.map((i) => i.href);

export function tabIndex(pathname: string) {
  return TAB_HREFS.findIndex((h) => pathname === h || pathname.startsWith(`${h}/`));
}

/** Records the slide direction for moving from the current tab to `href`. */
export function prepareTabMove(fromPath: string, href: string) {
  const from = tabIndex(fromPath);
  const to = TAB_HREFS.indexOf(href);
  pendingDirection = from < 0 || to < 0 || from === to ? null : to > from ? "right" : "left";
}

/** Slides each new page in from the side it came from, like switching screens in an app. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dir = useRef<"left" | "right" | null>(null);
  const last = useRef(pathname);
  if (last.current !== pathname) {
    dir.current = pendingDirection;
    pendingDirection = null;
    last.current = pathname;
  }
  const anim =
    dir.current === "right" ? "animate-[slide-in-right_.32s_cubic-bezier(.22,1,.36,1)]" : dir.current === "left" ? "animate-[slide-in-left_.32s_cubic-bezier(.22,1,.36,1)]" : "animate-[pagein_.28s_cubic-bezier(.22,1,.36,1)]";
  return (
    <div key={pathname} className={`${anim} motion-reduce:animate-none`}>
      {children}
    </div>
  );
}

const IGNORE = "input, textarea, select, button[role='slider'], [role='slider'], .react-flow, [data-no-swipe], iframe";

function scrollsSideways(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    if ((s.overflowX === "auto" || s.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 2) return true;
  }
  return false;
}

/** On phones, a horizontal swipe moves to the neighbouring bottom tab. */
export function SwipeNav() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 1023px)");
    let start: { x: number; y: number; t: number; ok: boolean } | null = null;

    const onStart = (e: TouchEvent) => {
      if (!phone.matches || e.touches.length !== 1) return (start = null);
      const target = e.target as Element;
      const t = e.touches[0];
      // Leave the screen edges to the browser's own back/forward gestures.
      const edge = t.clientX < 18 || t.clientX > window.innerWidth - 18;
      start = { x: t.clientX, y: t.clientY, t: Date.now(), ok: !edge && !target.closest(IGNORE) && !scrollsSideways(target) };
    };
    const onEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      if (!s?.ok || document.querySelector("[role='dialog'][aria-modal='true']")) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || Date.now() - s.t > 700) return;
      const i = tabIndex(pathRef.current);
      if (i < 0) return;
      const next = TAB_HREFS[dx < 0 ? i + 1 : i - 1];
      if (!next) return;
      prepareTabMove(pathRef.current, next);
      play("swoosh");
      router.push(next);
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [router]);

  return null;
}
