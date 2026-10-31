"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Section tabs inside a production. Horizontal scroll on phones (excluded from tab swiping). */
export function ProductionTabs({ items }: { items: { href: string; label: string; exact?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav data-no-swipe aria-label="Production sections" className="relative -mx-5 mb-6 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-1.5 rounded-2xl border-2 border-line bg-surface-2 p-1.5">
        {items.map((i) => {
          const on = i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "press whitespace-nowrap rounded-xl px-3 py-2 text-[12.5px] font-extrabold uppercase tracking-wide",
                on ? "bg-surface text-accent shadow-[0_3px_0_var(--color-line-strong)]" : "text-muted hover:text-text",
              )}
            >
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
