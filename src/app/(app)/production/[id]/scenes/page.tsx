import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { ShotStatusBadge, SHOT_STATUS_STYLE } from "@/components/production/badges";
import { field, labelCls } from "@/components/production/styles";
import { createScene, moveScene } from "../../actions";
import { getT } from "@/i18n/server";

export default async function ScenesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  const scenes = await db.scene.findMany({ where: { productionId: id }, orderBy: [{ order: "asc" }, { number: "asc" }], include: { shots: { orderBy: [{ order: "asc" }], select: { id: true, code: true, status: true, focalLength: true, description: true } } } });
  return (
    <div className="space-y-4">
      {scenes.length === 0 && <EmptyState title={t("No scenes yet")}>{t("Add the scenes you'll shoot. Each gets a creative brief and a shot list.")}</EmptyState>}
      <ol className="space-y-3">
        {scenes.map((s, i) => {
          const briefed = Boolean(s.dramaticObjective && s.visualIntention);
          return (
            <li key={s.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Link href={`/production/${id}/scenes/${s.id}`} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-lg font-black text-white shadow-[0_4px_0_var(--color-accent-strong)]">
                  {s.number}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/production/${id}/scenes/${s.id}`} className="flex items-center gap-1 text-[16px] font-black hover:text-accent">
                    {s.title || t("Scene {n}", { n: s.number })} <ChevronRight className="size-4" aria-hidden />
                  </Link>
                  <p className="line-clamp-2 text-[13px] font-semibold text-muted">{s.description || t("No description yet.")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {!briefed && <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-extrabold text-amber">{t("Brief missing")}</span>}
                    {s.shots.map((sh) => (
                      <Link key={sh.id} href={`/production/${id}/scenes/${s.id}#shot-${sh.id}`} title={t(SHOT_STATUS_STYLE[sh.status].label)}>
                        <ShotStatusBadge status={sh.status} label={`${sh.code}${sh.focalLength ? ` · ${sh.focalLength}mm` : ""}`} />
                      </Link>
                    ))}
                  </div>
                </div>
                {access.editCreative && (
                  <div className="flex flex-col gap-1">
                    <form action={moveScene.bind(null, id, s.id, -1)}>
                      <button disabled={i === 0} className="rounded-lg p-1 text-faint hover:bg-surface-2 disabled:opacity-30" aria-label={t("Move up")}>
                        <ArrowUp className="size-4" />
                      </button>
                    </form>
                    <form action={moveScene.bind(null, id, s.id, 1)}>
                      <button disabled={i === scenes.length - 1} className="rounded-lg p-1 text-faint hover:bg-surface-2 disabled:opacity-30" aria-label={t("Move down")}>
                        <ArrowDown className="size-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {access.editCreative && (
        <Card className="p-5">
          <form action={createScene.bind(null, id)} className="grid gap-3 sm:grid-cols-[100px_1fr_auto] sm:items-end">
            <label className={labelCls}>
              {t("Scene no.")}
              <input name="number" maxLength={12} placeholder={String(scenes.length + 1)} className={`${field} mt-1`} />
            </label>
            <label className={labelCls}>
              {t("Title")}
              <input name="title" maxLength={140} placeholder={t("e.g. INT. Stairwell — night")} className={`${field} mt-1`} />
            </label>
            <button className={buttonClass("primary", "md")}>
              <Plus className="size-4" aria-hidden /> {t("Add scene")}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
