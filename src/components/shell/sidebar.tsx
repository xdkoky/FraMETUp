"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import { Wordmark } from "@/components/brand";
import { LocaleSwitch } from "@/i18n/locale-switch";
import { useT } from "@/i18n/client";
import { GROWTH_NAV, NAV_ITEMS, SECONDARY_NAV } from "./nav-items";

function Logo() {
  const t = useT();
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5" aria-label={t("FraMETUp home")}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect x="2" y="9" width="28" height="20" rx="3" fill="#151923" stroke="#2A3142" />
        <path d="M3 9 L7 3 H13 L9 9 Z M13 9 L17 3 H23 L19 9 Z" fill="#E8B04B" />
        <circle cx="16" cy="19" r="4.5" fill="none" stroke="#6E9BFF" strokeWidth="1.6" />
        <circle cx="16" cy="19" r="1.4" fill="#6E9BFF" />
      </svg>
      <Wordmark />
    </Link>
  );
}

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> };

export function Sidebar({ isAdmin, displayName, pendingReviews }: { isAdmin: boolean; displayName: string; pendingReviews: number }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  useEffect(() => setOpen(false), [pathname]);

  const link = ({ href, label, icon: Icon }: Item) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150",
        isActive(href) ? "bg-surface-2 text-text shadow-[inset_0_0_0_1px_var(--color-line-soft)]" : "text-muted hover:bg-surface/70 hover:text-text",
      )}
    >
      {isActive(href) && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" aria-hidden />}
      <Icon className={cn("size-4 shrink-0", isActive(href) ? "text-accent" : "text-faint group-hover:text-muted")} aria-hidden />
      <span className="flex-1">{t(label)}</span>
      {href === "/feedback" && pendingReviews > 0 && (
        <span className="min-w-5 rounded-full bg-amber px-1.5 text-center text-[10px] font-semibold text-ink" aria-label={t("{n} pending", { n: pendingReviews })}>
          {pendingReviews}
        </span>
      )}
    </Link>
  );

  const nav = (
    <nav aria-label={t("Navigation")} className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(link)}
      <div className="slate-label mb-1 mt-5 px-3">{t("Growth")}</div>
      {GROWTH_NAV.map(link)}
      <div className="my-4 h-px bg-line-soft" />
      {SECONDARY_NAV.filter((i) => !("adminOnly" in i) || isAdmin).map(link)}
    </nav>
  );

  const footer = (
    <div className="mt-auto border-t border-line-soft pt-4">
      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <div className="min-w-0">
          <div className="truncate text-sm text-text">{displayName}</div>
          <div className="text-xs text-faint">{t("METU · Film Directing")}</div>
        </div>
        <LocaleSwitch />
      </div>
      <form action={logoutAction}>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface/70 hover:text-text">
          <LogOut className="size-4 text-faint" aria-hidden /> {t("Sign out")}
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line-soft bg-ink/80 px-3 py-5 backdrop-blur lg:flex">
        <div className="mb-8 px-2">
          <Logo />
        </div>
        {nav}
        {footer}
      </aside>

      {/* Phone: slim top bar + bottom tab bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line-soft bg-ink/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <LocaleSwitch />
      </div>
      <nav
        aria-label={t("Main sections")}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line-soft bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {NAV_ITEMS.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[10.5px]", isActive(href) ? "text-accent" : "text-faint")}
          >
            <Icon className="size-5" aria-hidden />
            {t(short)}
            {href === "/feedback" && pendingReviews > 0 && <span className="absolute right-[30%] top-2 size-2 rounded-full bg-amber" aria-hidden />}
          </Link>
        ))}
        <button
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className={cn("flex flex-col items-center gap-1 py-2.5 text-[10.5px]", open ? "text-accent" : "text-faint")}
        >
          <Menu className="size-5" aria-hidden />
          {t("More")}
        </button>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("Navigation")}>
          <div className="absolute inset-0 bg-black/60 animate-[fadein_.15s_ease-out]" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-line bg-ink px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 animate-[sheetup_.22s_ease-out]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-3" aria-hidden />
            <div className="mb-3 flex items-center justify-between px-2">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label={t("Close navigation")}>
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto">{nav}</div>
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
