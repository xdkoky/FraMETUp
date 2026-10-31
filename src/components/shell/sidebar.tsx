"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import { Wordmark } from "@/components/brand";
import { LocaleSwitch } from "@/i18n/locale-switch";
import { ThemeSwitch, type ThemePref } from "./theme-switch";
import { SoundSwitch } from "./ui-sounds";
import { useT } from "@/i18n/client";
import { GROWTH_NAV, NAV_ITEMS, SECONDARY_NAV } from "./nav-items";
import { slideToTab, useNavTarget } from "./app-motion";

function Logo() {
  const t = useT();
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5" aria-label={t("FraMETUp home")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="size-8 rounded-[9px]" aria-hidden />
      <Wordmark />
    </Link>
  );
}

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> };

export function Sidebar({ isAdmin, isStaff, displayName, pendingReviews, theme }: { isAdmin: boolean; isStaff: boolean; displayName: string; pendingReviews: number; theme: ThemePref }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navTarget = useNavTarget();
  useEffect(() => setOpen(false), [pathname]);

  const link = ({ href, label, icon: Icon }: Item) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3.5 rounded-2xl border-2 px-3.5 py-2.5 text-[13px] font-extrabold uppercase tracking-wide transition-colors duration-150",
        isActive(href) ? "border-accent/45 bg-accent-soft text-accent" : "border-transparent text-muted hover:bg-surface-2",
      )}
    >
      <Icon className={cn("size-[22px] shrink-0", isActive(href) ? "text-accent" : "text-faint group-hover:text-muted")} aria-hidden />
      <span className="flex-1">{t(label)}</span>
      {href === "/feedback" && pendingReviews > 0 && (
        <span className="min-w-5 rounded-full bg-amber-bright px-1.5 text-center text-[11px] font-extrabold text-white" aria-label={t("{n} pending", { n: pendingReviews })}>
          {pendingReviews}
        </span>
      )}
    </Link>
  );

  const nav = (
    <nav aria-label={t("Navigation")} className="flex flex-col gap-1">
      {NAV_ITEMS.map(link)}
      <div className="slate-label mb-1 mt-5 px-3">{t("Growth")}</div>
      {GROWTH_NAV.map(link)}
      <div className="my-4 h-px bg-line-soft" />
      {SECONDARY_NAV.filter((i) => ("adminOnly" in i ? isAdmin : "staffOnly" in i ? isStaff : true)).map(link)}
    </nav>
  );

  const footer = (
    <div className="mt-auto border-t border-line-soft pt-4">
      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <div className="min-w-0">
          <div className="truncate text-sm text-text">{displayName}</div>
          <div className="text-xs text-faint">{t("METU · Film Directing")}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <LocaleSwitch />
          <div className="flex items-center gap-1.5">
            <SoundSwitch />
            <ThemeSwitch initial={theme} />
          </div>
        </div>
      </div>
      <form action={logoutAction}>
        <button className="flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-[13px] font-extrabold uppercase tracking-wide text-muted hover:bg-surface-2">
          <LogOut className="size-[22px] text-faint" aria-hidden /> {t("Sign out")}
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r-2 border-line bg-surface px-3 py-5 lg:flex">
        <div className="mb-8 px-2">
          <Logo />
        </div>
        {nav}
        {footer}
      </aside>

      {/* Phone: slim top bar + floating tab bar (swipe between tabs, see app-motion) */}
      <div data-topbar className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-line bg-surface/95 px-5 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <Logo />
        <LocaleSwitch />
      </div>
      <nav
        aria-label={t("Main sections")}
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex gap-1 rounded-[26px] border-2 border-line bg-surface/95 p-1.5 shadow-[0_4px_0_var(--color-line),0_14px_32px_-12px_rgba(20,30,50,0.25)] backdrop-blur lg:hidden"
      >
        {NAV_ITEMS.map(({ href, short, icon: Icon }) => {
          const on = navTarget ? navTarget === href : isActive(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onClick={(e) => {
                if (slideToTab(href)) e.preventDefault();
              }}
              aria-current={on ? "page" : undefined}
              className={cn(
                "press relative flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[20px] transition-[flex-grow,background-color] duration-300 ease-out",
                on ? "flex-[1.7] bg-accent text-white shadow-[0_4px_0_var(--color-accent-strong)]" : "flex-1 text-faint",
              )}
            >
              <Icon key={on ? "on" : "off"} className={cn("size-[22px]", on && "-translate-y-0.5 animate-[tab-pop_.42s_cubic-bezier(.22,1,.36,1)]")} aria-hidden />
              <span className={cn("max-w-full truncate px-1 text-[10px] font-extrabold uppercase leading-none tracking-wide", on ? "block" : "sr-only")}>{t(short)}</span>
              {href === "/feedback" && pendingReviews > 0 && <span className="absolute right-[22%] top-2 size-2.5 rounded-full border-2 border-surface bg-amber-bright" aria-hidden />}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className={cn("press flex h-14 flex-1 flex-col items-center justify-center rounded-[20px]", open ? "bg-accent-soft text-accent" : "text-faint")}
        >
          <Menu className="size-[22px]" aria-hidden />
          <span className="sr-only">{t("More")}</span>
        </button>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("Navigation")}>
          <div className="absolute inset-0 bg-black/30 animate-[fadein_.15s_ease-out]" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl border-t-2 border-line bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 animate-[sheetup_.22s_ease-out]">
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
