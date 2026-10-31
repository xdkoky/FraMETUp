import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Clock, Megaphone, PartyPopper, Radio, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { prepChecklist, prepProgress } from "@/lib/production/lifecycle";
import { CallSheetData, callTimeFor } from "@/lib/production/callsheet";
import { roleLabel } from "@/lib/production/roles";
import { scheduleProgress } from "@/lib/production/schedule";
import { Card, CardHeader, Meter } from "@/components/ui/misc";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { field } from "@/components/production/styles";
import { postAnnouncement, setProductionStatus } from "../actions";
import { getFormat, getT } from "@/i18n/server";

export default async function ProductionOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const { production, access } = await requireProduction(user, id);
  const b = `/production/${id}`;
  const [members, scenes, shots, published, openTasks, announcements, myTasks] = await Promise.all([
    db.productionMember.findMany({ where: { productionId: id }, orderBy: { invitedAt: "asc" } }),
    db.scene.findMany({ where: { productionId: id }, select: { id: true, dramaticObjective: true, visualIntention: true } }),
    db.shot.findMany({ where: { productionId: id }, orderBy: [{ order: "asc" }], select: { id: true, code: true, status: true, focalLength: true, setupMinutes: true, prepStartedAt: true, completedAt: true, description: true } }),
    db.callSheetVersion.findFirst({ where: { productionId: id, state: "PUBLISHED" }, orderBy: { version: "desc" }, include: { acknowledgements: { select: { memberId: true } } } }),
    db.productionTask.count({ where: { productionId: id, status: { not: "DONE" } } }),
    db.productionAnnouncement.findMany({ where: { productionId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
    access.member ? db.productionTask.findMany({ where: { productionId: id, assigneeId: access.member.id, status: { not: "DONE" } }, orderBy: { due: { sort: "asc", nulls: "last" } }, take: 5 }) : Promise.resolve([]),
  ]);
  const accepted = members.filter((m) => m.status === "ACCEPTED");
  const items = prepChecklist(
    {
      hasDirector: accepted.some((m) => m.roles.includes("director")),
      hasDop: accepted.some((m) => m.roles.includes("dop")),
      crewCount: accepted.length,
      sceneCount: scenes.length,
      shotCount: shots.length,
      shotsWithFocal: shots.filter((s) => s.focalLength).length,
      briefsFilled: scenes.filter((s) => s.dramaticObjective && s.visualIntention).length,
      callSheetPublished: Boolean(published),
      openTasks,
      hasShootDate: Boolean(production.shootDate),
    },
    b,
  );
  const data = published ? CallSheetData.parse(published.data) : null;
  const myCall = data && access.member ? callTimeFor(data, access.member.id) : "";
  const acked = Boolean(published && access.member && published.acknowledgements.some((a) => a.memberId === access.member!.id));
  const progress = scheduleProgress(shots);
  const current = shots.find((s) => ["SHOOTING", "READY", "PREPARING"].includes(s.status));
  const next = shots.find((s) => s.status === "PLANNED" || s.status === "PICKUP");
  const stage = production.status;
  const nextStage = { PRE_PRODUCTION: "READY", READY: "PRODUCTION", PRODUCTION: "WRAPPED", WRAPPED: "POST_PRODUCTION", POST_PRODUCTION: "COMPLETED", COMPLETED: null }[stage] as typeof stage | null;
  const nextStageLabel = { READY: "Mark ready to shoot", PRODUCTION: "Start shooting", WRAPPED: "Wrap the production", POST_PRODUCTION: "Move to post-production", COMPLETED: "Mark completed" } as const;

  const announcementsCard = (
    <Card>
      <CardHeader eyebrow={t("From the production")} title={t("Announcements")} />
      <div className="space-y-3 p-5 pt-3">
        {announcements.length === 0 && <p className="text-[13px] font-semibold text-faint">{t("No announcements yet.")}</p>}
        {announcements.map((a) => (
          <div key={a.id} className={`rounded-xl border-2 p-3 ${a.important ? "border-danger/40 bg-danger/10" : "border-line"}`}>
            <p className="text-[14px] font-semibold whitespace-pre-line">
              {a.important && <AlertTriangle className="mr-1 inline size-4 text-danger" aria-label={t("Important")} />}
              {a.body}
            </p>
            <p className="mt-1 text-[11.5px] font-bold text-faint">{fmt.date(a.createdAt)}</p>
          </div>
        ))}
        {access.manage && (
          <form action={postAnnouncement.bind(null, id)} className="space-y-2">
            <textarea name="body" rows={2} maxLength={1000} required placeholder={t("Write an announcement for the crew…")} className={field} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[13px] font-bold text-muted">
                <input type="checkbox" name="important" className="size-4 accent-[var(--color-danger)]" /> {t("Important — notify everyone")}
              </label>
              <button className={buttonClass("secondary", "sm")}>
                <Megaphone className="size-3.5" aria-hidden /> {t("Post")}
              </button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );

  const callCard = (
    <Card className="p-5">
      <div className="slate-label">{t("Your call")}</div>
      {published ? (
        <>
          <div className="mt-1 text-3xl font-black">{myCall || "—"}</div>
          <p className="text-[13px] font-semibold text-muted">
            {t("Call sheet v{n}", { n: published.version })} · {data?.location || production.location}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkButton href={`${b}/callsheet`} size="sm" variant={acked ? "secondary" : "primary"}>
              {acked ? t("Open call sheet") : t("Read & confirm")}
            </LinkButton>
          </div>
          {access.member && !acked && <p className="mt-2 text-[12px] font-bold text-amber">{t("You haven't confirmed the latest version yet.")}</p>}
        </>
      ) : (
        <p className="mt-1 text-[14px] font-semibold text-muted">{t("The call sheet hasn't been published yet.")}</p>
      )}
    </Card>
  );

  if (access.limited) {
    const contacts = accepted.filter((m) => m.isManager || m.roles.some((r) => ["director", "first_ad", "producer", "production_manager"].includes(r)));
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {callCard}
        <Card className="p-5">
          <div className="slate-label mb-2">{t("Production contacts")}</div>
          <ul className="space-y-1.5">
            {contacts.map((m) => (
              <li key={m.id} className="text-[14px] font-bold">
                {m.name} <span className="font-semibold text-muted">· {m.roles.map((r) => t(roleLabel(r))).join(", ")}</span>
                {m.phone && (
                  <a href={`tel:${m.phone}`} className="ml-2 text-accent">
                    {m.phone}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <div className="md:col-span-2">{announcementsCard}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(stage === "PRE_PRODUCTION" || stage === "READY") && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black">{t("Preparation")}</h2>
            <span className="text-[13px] font-extrabold text-muted">{Math.round(prepProgress(items) * 100)}%</span>
          </div>
          <Meter className="mt-2" value={prepProgress(items) * 100} label={t("Preparation")} color="var(--color-success-bright)" />
          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {items.map((i) => (
              <li key={i.key}>
                <Link href={i.href} className="flex items-center gap-2 rounded-xl p-2 text-[14px] font-bold hover:bg-surface-2">
                  {i.done ? <CheckCircle2 className="size-5 text-success" aria-hidden /> : <Circle className="size-5 text-line-strong" aria-hidden />}
                  <span className={i.done ? "text-muted line-through" : ""}>{t(i.label)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {stage === "PRODUCTION" && (
        <Card className="border-danger/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="slate-label !text-danger">
                <Radio className="mr-1 inline size-3.5" aria-hidden /> {t("Shooting now")}
              </div>
              <div className="mt-1 text-2xl font-black">{current ? `${t("Shot")} ${current.code}` : next ? t("Next: shot {code}", { code: next.code }) : t("All shots done")}</div>
              <p className="text-[13px] font-semibold text-muted">{t("{a} of {b} shots completed", { a: progress.completed, b: progress.total })}</p>
            </div>
            <LinkButton href={`${b}/live`} variant="danger">
              {t("Open Live Set")} <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
          </div>
          <Meter className="mt-3" value={progress.total ? (progress.completed / progress.total) * 100 : 0} label={t("Shooting progress")} color="var(--color-danger)" />
        </Card>
      )}

      {["WRAPPED", "POST_PRODUCTION", "COMPLETED"].includes(stage) && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber/40 p-5">
          <div className="flex items-center gap-3">
            <PartyPopper className="size-8 text-amber-bright" aria-hidden />
            <div>
              <div className="text-lg font-black">{t("That's a wrap!")}</div>
              <p className="text-[13px] font-semibold text-muted">{t("{a} of {b} shots completed · {c} skipped", { a: progress.completed, b: progress.total, c: progress.skipped })}</p>
            </div>
          </div>
          <LinkButton href={`${b}/wrap`} variant="amber">
            {t("Wrap report & reflection")}
          </LinkButton>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {callCard}
        <Card className="p-5">
          <div className="slate-label">{t("Your role")}</div>
          <div className="mt-1 text-xl font-black">{access.member?.roles.length ? access.member.roles.map((r) => t(roleLabel(r))).join(", ") : access.staffView ? t("Instructor") : t("Production lead")}</div>
          <Link href={`${b}/crew`} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-accent">
            <Users className="size-4" aria-hidden /> {t("{n} crew members", { n: accepted.length })}
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader eyebrow={t("Before the shoot")} title={t("Your tasks")} action={<Link href={`${b}/tasks`} className="text-xs font-bold text-accent">{t("All tasks →")}</Link>} />
          <div className="p-5 pt-3">
            {myTasks.length ? (
              <ul className="space-y-2">
                {myTasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2 text-[14px] font-bold">
                    <Clock className="mt-0.5 size-4 text-accent" aria-hidden />
                    <span>
                      {task.title}
                      {task.due && <span className="block text-[12px] font-semibold text-faint">{t("due {date}", { date: fmt.date(task.due) })}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] font-semibold text-faint">{t("Nothing assigned to you.")}</p>
            )}
          </div>
        </Card>
        {announcementsCard}
      </div>

      {access.manage && nextStage && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-[14px] font-semibold text-muted">{t("When you're ready, move the production to the next stage. The crew is notified.")}</p>
          <form action={setProductionStatus.bind(null, id, nextStage)}>
            <button className={buttonClass(nextStage === "WRAPPED" ? "amber" : "primary", "md")}>{t(nextStageLabel[nextStage as keyof typeof nextStageLabel])}</button>
          </form>
        </Card>
      )}
    </div>
  );
}
