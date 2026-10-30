"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import { NAV_ITEMS, SECONDARY_NAV } from "./nav-items";

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 group" aria-label="DIRECTOR OS home">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect x="2" y="9" width="28" height="20" rx="3" fill="#151923" stroke="#2A3142" />
        <path d="M3 9 L7 3 H13 L9 9 Z M13 9 L17 3 H23 L19 9 Z" fill="#E8B04B" />
        <circle cx="16" cy="19" r="4.5" fill="none" stroke="#6E9BFF" strokeWidth="1.6" />
        <circle cx="16" cy="19" r="1.4" fill="#6E9BFF" />
      </svg>
      <span className="font-mono text-[13px] tracking-[0.22em] text-text">
        DIRECTOR<span className="text-accent">OS</span>
      </span>
    </Link>
  );
}

export function Sidebar({ isAdmin, displayName, pendingReviews }: { isAdmin: boolean; displayName: string; pendingReviews: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const links = (
    <nav aria-label="Primary" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive(href) ? "bg-surface-2 text-text" : "text-muted hover:text-text hover:bg-surface/70",
          )}
        >
          {isActive(href) && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-accent" aria-hidden />}
          <Icon className={cn("size-4 shrink-0", isActive(href) ? "text-accent" : "text-faint group-hover:text-muted")} aria-hidden />
          <span className="flex-1">{label}</span>
          {href === "/feedback" && pendingReviews > 0 && (
            <span className="rounded-full bg-amber text-ink text-[10px] font-semibold px-1.5 min-w-5 text-center" aria-label={`${pendingReviews} pending`}>
              {pendingReviews}
            </span>
          )}
        </Link>
      ))}
      <div className="my-3 h-px bg-line-soft" />
      {SECONDARY_NAV.filter((i) => !("adminOnly" in i) || isAdmin).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive(href) ? "bg-surface-2 text-text" : "text-muted hover:text-text hover:bg-surface/70",
          )}
        >
          <Icon className="size-4 text-faint" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="mt-auto pt-4 border-t border-line-soft">
      <div className="px-3 pb-2">
        <div className="text-sm text-text truncate">{displayName}</div>
        <div className="text-xs text-faint">METU · Film Directing</div>
      </div>
      <form action={logoutAction}>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:text-text hover:bg-surface/70">
          <LogOut className="size-4 text-faint" aria-hidden /> Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-line-soft bg-ink/80 backdrop-blur px-3 py-5 z-30">
        <div className="px-2 mb-8">
          <Logo />
        </div>
        {links}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line-soft bg-ink/90 backdrop-blur px-4 h-14">
        <Logo />
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-muted hover:bg-surface-2"
          aria-label="Open navigation"
          aria-expanded={open}
        >
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-ink border-l border-line px-3 py-5 flex flex-col">
            <div className="flex items-center justify-between px-2 mb-6">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Close navigation">
                <X className="size-5" />
              </button>
            </div>
            {links}
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
