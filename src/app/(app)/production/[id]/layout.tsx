import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { STAGE_LABEL } from "@/lib/production/lifecycle";
import { Page } from "@/components/shell/page";
import { ProductionTabs } from "@/components/production/tabs";
import { StageBadge } from "@/components/production/badges";
import { getFormat, getT } from "@/i18n/server";
import { db } from "@/lib/db";

export default async function ProductionLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  const p = await db.production.findUniqueOrThrow({ where: { id }, select: { title: true, status: true, shootDate: true, location: true } });
  const b = `/production/${id}`;
  const tabs = access.limited
    ? [
        { href: b, label: t("Overview"), exact: true },
        { href: `${b}/callsheet`, label: t("Call sheet") },
      ]
    : [
        { href: b, label: t("Overview"), exact: true },
        { href: `${b}/crew`, label: t("Crew") },
        { href: `${b}/scenes`, label: t("Scenes & shots") },
        { href: `${b}/callsheet`, label: t("Call sheet") },
        { href: `${b}/tasks`, label: t("Tasks") },
        { href: `${b}/documents`, label: t("Documents") },
        { href: `${b}/live`, label: t("Live set") },
        { href: `${b}/wrap`, label: t("Wrap") },
        ...(access.manage ? [{ href: `${b}/settings`, label: t("Settings") }] : []),
      ];
  return (
    <Page className="max-w-5xl">
      <Link href="/production" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> {t("Production Hub")}
      </Link>
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={p.status} label={t(STAGE_LABEL[p.status])} />
          {access.staffView && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-muted">{t("Instructor view")}</span>}
        </div>
        <h1 className="mt-2 font-display text-[2rem] font-black leading-tight md:text-[2.4rem]">{p.title}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] font-bold text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden /> {p.shootDate ? `${fmt.date(p.shootDate)} · ${p.shootDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" })}` : t("Date not set")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden /> {p.location}
          </span>
        </div>
      </header>
      <ProductionTabs items={tabs} />
      {children}
    </Page>
  );
}
