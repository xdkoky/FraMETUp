import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Columns2, Plus, ScanLine, Star, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { Card } from "@/components/ui/misc";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { ShotStatusBadge, SHOT_STATUS_STYLE } from "@/components/production/badges";
import { ShotFields } from "@/components/production/shot-form";
import { CommentThread } from "@/components/production/comments";
import { field, labelCls } from "@/components/production/styles";
import { createShot, deleteScene, deleteShot, moveShot, updateScene, updateShot } from "../../../actions";
import { getT } from "@/i18n/server";

const DIRECTOR_FIELDS = [
  ["dramaticObjective", "Dramatic objective", "What must change in this scene?"],
  ["tone", "Emotional tone", "e.g. tense, tender, absurd"],
  ["motivations", "Character motivations", "Who wants what from whom?"],
  ["directorNotes", "Director's notes", ""],
] as const;
const DOP_FIELDS = [
  ["visualIntention", "Visual intention", "How should the scene look and feel?"],
  ["framing", "Framing intention", "e.g. tight, oppressive singles; wide for the reveal"],
  ["cameraMovement", "Camera movement", "e.g. static until the turn, then handheld"],
  ["lighting", "Lighting direction", "e.g. single practical, hard top light"],
  ["sound", "Sound considerations", "e.g. clean dialogue, room tone, off-screen traffic"],
  ["dopNotes", "Cinematographer's notes", ""],
] as const;

export default async function ScenePage({ params }: { params: Promise<{ id: string; sceneId: string }> }) {
  const { id, sceneId } = await params;
  const t = await getT();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (access.limited) notFound();
  const scene = await db.scene.findFirst({
    where: { id: sceneId, productionId: id },
    include: { shots: { orderBy: [{ order: "asc" }], include: { references: { orderBy: { createdAt: "asc" } }, _count: { select: { takes: true } } } } },
  });
  if (!scene) notFound();
  const edit = access.editCreative;
  const area = (name: string, label: string, ph: string, value: string) => (
    <label key={name} className={labelCls}>
      {t(label)}
      <textarea name={name} defaultValue={value} rows={2} maxLength={3000} disabled={!edit} placeholder={ph ? t(ph) : ""} className={`${field} mt-1 disabled:opacity-80`} />
    </label>
  );

  return (
    <div className="space-y-6">
      <Link href={`/production/${id}/scenes`} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> {t("All scenes")}
      </Link>

      <Card className="p-5">
        <form action={updateScene.bind(null, id, sceneId)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
            <label className={labelCls}>
              {t("Scene no.")}
              <input name="number" defaultValue={scene.number} disabled={!edit} maxLength={12} className={`${field} mt-1`} />
            </label>
            <label className={labelCls}>
              {t("Title")}
              <input name="title" defaultValue={scene.title} disabled={!edit} maxLength={140} className={`${field} mt-1`} />
            </label>
          </div>
          {area("description", "Scene description", "What happens?", scene.description)}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl border-2 border-accent/30 bg-accent-soft/40 p-4">
              <h2 className="text-[15px] font-black text-accent">{t("Director — the why")}</h2>
              {DIRECTOR_FIELDS.map(([n, l, p]) => area(n, l, p, scene[n]))}
            </div>
            <div className="space-y-3 rounded-2xl border-2 border-amber/30 bg-amber-soft/40 p-4">
              <h2 className="text-[15px] font-black text-amber">{t("Cinematographer — the how")}</h2>
              {DOP_FIELDS.map(([n, l, p]) => area(n, l, p, scene[n]))}
            </div>
          </div>
          {edit && <button className={buttonClass("primary", "md")}>{t("Save brief")}</button>}
        </form>
        <div className="mt-5 border-t-2 border-line-soft pt-4">
          <h3 className="mb-2 text-[14px] font-black">{t("Discussion")}</h3>
          <CommentThread productionId={id} targetType="scene" targetId={sceneId} canComment={!access.limited} />
        </div>
      </Card>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-black">{t("Shot list")}</h2>
          {edit && (
            <LinkButton href={`/viewfinder?production=${id}&scene=${sceneId}`} variant="secondary" size="sm">
              <ScanLine className="size-4" aria-hidden /> {t("Frame a shot in the Viewfinder")}
            </LinkButton>
          )}
        </div>
        <ol className="space-y-3">
          {scene.shots.map((shot, i) => {
            const details = [shot.size, shot.angle, shot.movement].filter(Boolean).map((x) => t(x)).join(" · ");
            const tech = [shot.focalLength ? `${shot.focalLength} mm` : null, shot.cameraLabel, shot.sensorLabel, shot.aspect, shot.setupMinutes ? t("{n} min setup", { n: shot.setupMinutes }) : null].filter(Boolean).join(" · ");
            return (
              <li key={shot.id} id={`shot-${shot.id}`} className="card scroll-mt-24 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid min-w-12 place-items-center rounded-xl border-2 border-line px-2 py-1.5 text-[15px] font-black">{shot.code}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ShotStatusBadge status={shot.status} label={t(SHOT_STATUS_STYLE[shot.status].label)} />
                      {shot._count.takes > 0 && <span className="text-[12px] font-bold text-faint">{t("{n} takes", { n: shot._count.takes })}</span>}
                    </div>
                    <p className="mt-1 text-[14.5px] font-bold">{shot.description || t("No description yet.")}</p>
                    {details && <p className="text-[13px] font-semibold text-muted">{details}</p>}
                    {tech && <p className="text-[13px] font-semibold text-muted">{tech}</p>}
                    {shot.intention && (
                      <p className="mt-1 text-[13px] font-semibold">
                        <span className="text-accent">{t("Why:")}</span> {shot.intention}
                      </p>
                    )}
                    {shot.dopNotes && (
                      <p className="text-[13px] font-semibold">
                        <span className="text-amber">{t("DoP:")}</span> {shot.dopNotes}
                      </p>
                    )}
                  </div>
                  {edit && (
                    <div className="flex flex-col gap-1">
                      <form action={moveShot.bind(null, id, shot.id, -1)}>
                        <button disabled={i === 0} className="rounded-lg p-1 text-faint hover:bg-surface-2 disabled:opacity-30" aria-label={t("Move up")}>
                          <ArrowUp className="size-4" />
                        </button>
                      </form>
                      <form action={moveShot.bind(null, id, shot.id, 1)}>
                        <button disabled={i === scene.shots.length - 1} className="rounded-lg p-1 text-faint hover:bg-surface-2 disabled:opacity-30" aria-label={t("Move down")}>
                          <ArrowDown className="size-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {shot.references.length > 0 && (
                  <div className="mt-3">
                    <div className="relative flex gap-2 overflow-x-auto pb-1" data-no-swipe>
                      {shot.references.map((r) => (
                        <figure key={r.id} className={`relative w-36 shrink-0 overflow-hidden rounded-xl border-2 ${shot.preferredReferenceId === r.id ? "border-amber-bright" : "border-line"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/production-files/reference/${r.id}`} alt={t("Reference frame, {mm} mm", { mm: r.focalLength ?? "?" })} className="aspect-video w-full object-cover" loading="lazy" />
                          <figcaption className="px-1.5 py-1 text-[11px] font-bold text-muted">
                            {r.focalLength ? `${r.focalLength} mm` : "—"} {!r.calibrated && <span className="text-amber">≈</span>}
                          </figcaption>
                          {shot.preferredReferenceId === r.id && <Star className="absolute right-1 top-1 size-4 fill-amber-bright text-amber-bright" aria-label={t("Preferred")} />}
                        </figure>
                      ))}
                    </div>
                    <Link href={`/production/${id}/shots/${shot.id}`} className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-accent">
                      <Columns2 className="size-4" aria-hidden /> {t("Compare framings & choose")}
                    </Link>
                  </div>
                )}

                {edit && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[13px] font-extrabold text-accent">{t("Edit shot")}</summary>
                    <form action={updateShot.bind(null, id, shot.id)} className="mt-3 space-y-3">
                      <ShotFields shot={shot} />
                      <div className="flex flex-wrap gap-2">
                        <button className={buttonClass("primary", "sm")}>{t("Save shot")}</button>
                        <Link href={`/viewfinder?production=${id}&scene=${sceneId}&shot=${shot.id}${shot.focalLength ? `&focal=${shot.focalLength}` : ""}`} className={buttonClass("secondary", "sm")}>
                          <ScanLine className="size-3.5" aria-hidden /> {t("Viewfinder")}
                        </Link>
                      </div>
                    </form>
                    <form action={deleteShot.bind(null, id, shot.id)} className="mt-2">
                      <button className={`${buttonClass("ghost", "sm")} !text-danger`}>
                        <Trash2 className="size-3.5" aria-hidden /> {t("Delete shot")}
                      </button>
                    </form>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
        {scene.shots.length === 0 && <p className="text-[14px] font-semibold text-faint">{t("No shots yet.")}</p>}
        {edit && (
          <Card className="mt-4 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-black">
              <Plus className="size-4 text-accent" aria-hidden /> {t("Add a shot")}
            </h3>
            <form action={createShot.bind(null, id, sceneId)} className="space-y-3">
              <ShotFields />
              <button className={buttonClass("primary", "md")}>{t("Add shot")}</button>
            </form>
          </Card>
        )}
      </section>

      {access.manage && (
        <form action={deleteScene.bind(null, id, sceneId)}>
          <button className={`${buttonClass("ghost", "sm")} !text-danger`}>
            <Trash2 className="size-3.5" aria-hidden /> {t("Delete scene and its shots")}
          </button>
        </form>
      )}
    </div>
  );
}
