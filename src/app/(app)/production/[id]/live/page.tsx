import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleDashed, Flag, Printer, SkipForward, Star } from "lucide-react";
import type { ShotStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { latestChangeAt, requireProduction } from "@/lib/services/production";
import { scheduleProgress } from "@/lib/production/schedule";
import { DEPARTMENT_LABEL, READINESS_DEPARTMENTS, type Department } from "@/lib/production/roles";
import { Card, Meter } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { LivePulse } from "@/components/production/live-pulse";
import { ShotStatusBadge, SHOT_STATUS_STYLE } from "@/components/production/badges";
import { field } from "@/components/production/styles";
import { addTake, setReadiness, setShotStatus, togglePreferredTake } from "../../actions";
import { getFormat, getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

const NEXT_ACTION: Partial<Record<ShotStatus, { to: ShotStatus; label: string; variant: "primary" | "amber" | "danger" }>> = {
  PLANNED: { to: "PREPARING", label: "Start preparation", variant: "primary" },
  PICKUP: { to: "PREPARING", label: "Start preparation", variant: "primary" },
  PREPARING: { to: "READY", label: "Mark ready", variant: "amber" },
  READY: { to: "SHOOTING", label: "Start shooting", variant: "danger" },
  SHOOTING: { to: "COMPLETED", label: "Mark completed", variant: "primary" },
};

export default async function LiveSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (access.limited) notFound();
  const [shots, readiness, changes, changedAt] = await Promise.all([
    db.shot.findMany({ where: { productionId: id }, include: { scene: { select: { number: true, order: true } }, takes: { orderBy: { take: "desc" } } } }),
    db.departmentReadiness.findMany({ where: { productionId: id } }),
    db.productionChange.findMany({ where: { productionId: id }, orderBy: { createdAt: "desc" }, take: 8 }),
    latestChangeAt(id),
  ]);
  shots.sort((a, b) => a.scene.order - b.scene.order || a.order - b.order);
  const current = shots.find((s) => ["SHOOTING", "READY", "PREPARING"].includes(s.status)) ?? shots.find((s) => s.status === "PLANNED" || s.status === "PICKUP") ?? null;
  const upcoming = shots.filter((s) => s.id !== current?.id && (s.status === "PLANNED" || s.status === "PICKUP"));
  const p = scheduleProgress(shots);
  const next = current ? NEXT_ACTION[current.status] : undefined;
  const ready = (d: Department) => readiness.find((r) => r.department === d);
  const allReady = READINESS_DEPARTMENTS.every((d) => ready(d)?.ready);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LivePulse productionId={id} initial={changedAt?.toISOString() ?? null} />
        <Link href={`/production-print/${id}/takes`} target="_blank" className={buttonClass("ghost", "sm")}>
          <Printer className="size-3.5" aria-hidden /> {t("Take report")}
        </Link>
      </div>

      {current ? (
        <Card className={cn("p-5", current.status === "SHOOTING" && "border-danger/50")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="slate-label">{["PLANNED", "PICKUP"].includes(current.status) ? t("Next setup") : t("Current setup")}</div>
            <ShotStatusBadge status={current.status} label={t(SHOT_STATUS_STYLE[current.status].label)} />
          </div>
          <div className="mt-1 text-4xl font-black">
            {t("Sc")} {current.scene.number} · {current.code}
          </div>
          <p className="mt-1 text-[15px] font-bold">{current.description || "—"}</p>
          <p className="text-[13px] font-semibold text-muted">{[current.size, current.movement, current.focalLength ? `${current.focalLength} mm` : null, current.setupMinutes ? t("{n} min planned", { n: current.setupMinutes }) : null].filter(Boolean).join(" · ")}</p>
          {access.liveUpdate && (
            <div className="mt-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
              {next && (
                <form action={setShotStatus.bind(null, id, current.id, next.to)}>
                  <button className={buttonClass(next.variant, "lg", "w-full")}>{t(next.label)}</button>
                </form>
              )}
              <form action={setShotStatus.bind(null, id, current.id, "SKIPPED")}>
                <button className={buttonClass("secondary", "lg", "w-full")}>
                  <SkipForward className="size-4" aria-hidden /> {t("Skip")}
                </button>
              </form>
              <form action={setShotStatus.bind(null, id, current.id, "PICKUP")}>
                <button className={buttonClass("secondary", "lg", "w-full")}>
                  <Flag className="size-4" aria-hidden /> {t("Pickup")}
                </button>
              </form>
            </div>
          )}
          {current.status === "READY" && !allReady && <p className="mt-2 text-[12.5px] font-bold text-amber">{t("Not every department has confirmed it's ready.")}</p>}
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
          <p className="mt-2 text-lg font-black">{shots.length ? t("All shots are done or skipped.") : t("Add shots to the shot list to use the Live Set.")}</p>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-1 text-[15px] font-black">{t("Department readiness")}</h2>
        <p className="mb-3 text-[12px] font-semibold text-faint">{t("A quick status signal — it never replaces safety checks or talking to each other on set.")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {READINESS_DEPARTMENTS.map((d) => {
            const r = ready(d);
            const can = access.readyDepartments.includes(d);
            const body = (
              <>
                {r?.ready ? <CheckCircle2 className="size-6" aria-hidden /> : <CircleDashed className="size-6" aria-hidden />}
                <span className="text-[13px] font-extrabold">{t(DEPARTMENT_LABEL[d])}</span>
                <span className="text-[11px] font-bold opacity-80">{r?.ready ? t("Ready") : t("Preparing")}</span>
              </>
            );
            const cls = cn("press flex w-full flex-col items-center gap-1 rounded-2xl border-2 p-3", r?.ready ? "border-success bg-success/10 text-success-strong shadow-[0_3px_0_var(--color-success)]" : "border-line text-muted shadow-[0_3px_0_var(--color-line)]");
            return can ? (
              <form key={d} action={setReadiness.bind(null, id, d, !r?.ready)}>
                <button className={cls} aria-pressed={Boolean(r?.ready)}>
                  {body}
                </button>
              </form>
            ) : (
              <div key={d} className={cls}>
                {body}
              </div>
            );
          })}
        </div>
      </Card>

      {current && access.logTakes && (
        <Card className="p-5">
          <h2 className="mb-3 text-[15px] font-black">{t("Take log — shot {code}", { code: current.code })}</h2>
          <form action={addTake.bind(null, id, current.id)} className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="notes" maxLength={1000} placeholder={t("Notes (performance, timing…)")} className={field} />
              <input name="continuity" maxLength={1000} placeholder={t("Continuity (props, positions…)")} className={field} />
              <input name="soundIssue" maxLength={300} placeholder={t("Sound issue")} className={field} />
              <input name="cameraIssue" maxLength={300} placeholder={t("Camera issue")} className={field} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[13px] font-bold text-muted">
                <input type="checkbox" name="preferred" className="size-4 accent-[var(--color-amber-bright)]" /> {t("Director's preferred take")}
              </label>
              <label className="text-[13px] font-bold text-muted">
                {t("Reference photo")} <input type="file" name="photo" accept="image/png,image/jpeg" capture="environment" className="ml-1 text-[12px]" />
              </label>
              <button className={buttonClass("primary", "md")}>{t("Log take {n}", { n: (current.takes[0]?.take ?? 0) + 1 })}</button>
            </div>
          </form>
          {current.takes.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {current.takes.map((tk) => (
                <li key={tk.id} className="flex items-start gap-2 rounded-xl bg-surface-2 p-2 text-[13px] font-semibold">
                  <form action={togglePreferredTake.bind(null, id, tk.id)}>
                    <button aria-label={tk.preferred ? t("Unmark preferred take") : t("Mark as preferred take")} className="p-0.5">
                      <Star className={cn("size-5", tk.preferred ? "fill-amber-bright text-amber-bright" : "text-line-strong")} />
                    </button>
                  </form>
                  <span className="font-extrabold">T{tk.take}</span>
                  <span className="min-w-0 flex-1">
                    {[tk.notes, tk.continuity && `${t("Continuity:")} ${tk.continuity}`, tk.soundIssue && `${t("Sound:")} ${tk.soundIssue}`, tk.cameraIssue && `${t("Camera:")} ${tk.cameraIssue}`].filter(Boolean).join(" · ") || "—"}
                    {tk.photoKey && (
                      <a href={`/api/production-files/take/${tk.id}`} target="_blank" rel="noopener" className="ml-1 text-accent">
                        {t("photo")}
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-2 text-[15px] font-black">{t("Progress")}</h2>
        <Meter value={p.total ? (p.completed / p.total) * 100 : 0} label={t("Shooting progress")} color="var(--color-success-bright)" />
        <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {[
            [t("Completed"), `${p.completed}/${p.total}`],
            [t("Remaining"), String(p.remaining)],
            [t("Planned vs actual"), p.deviationMinutes === null ? "—" : `${p.deviationMinutes > 0 ? "+" : ""}${p.deviationMinutes} min`],
            [t("Est. time left"), p.projectedRemainingMinutes === null ? `${p.remainingPlannedMinutes} min*` : `≈ ${p.projectedRemainingMinutes} min`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2 p-2">
              <div className="text-xl font-black">{v}</div>
              <div className="text-[11.5px] font-bold text-muted">{k}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] font-semibold text-faint">
          {p.sampleSize ? t("Estimate based on {n} completed setups at the current pace — a rough guide, not a promise.", { n: p.sampleSize }) : t("* Planned time only — the estimate improves once setups are completed.")}
        </p>
      </Card>

      {upcoming.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-2 text-[15px] font-black">{t("Up next")}</h2>
          <ul className="space-y-1.5">
            {upcoming.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-[14px] font-bold">
                <span className="w-16 shrink-0">
                  {s.scene.number}·{s.code}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-muted">{s.description}</span>
                {s.status === "PICKUP" && <ShotStatusBadge status="PICKUP" label={t("Needs pickup")} />}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-2 text-[15px] font-black">{t("Latest updates")}</h2>
        <ul className="space-y-1">
          {changes.map((c) => (
            <li key={c.id} className={cn("text-[13px] font-semibold", c.important ? "text-danger" : "text-muted")}>
              <span className="font-mono text-[12px] text-faint">{c.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest" })}</span> {c.summary}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] font-semibold text-faint">{fmt.date(new Date())}</p>
      </Card>
    </div>
  );
}
