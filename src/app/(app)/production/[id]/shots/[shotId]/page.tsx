import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ScanLine, Star, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { CommentThread } from "@/components/production/comments";
import { choosePreferredReference, deleteReference } from "../../../actions";
import { getFormat, getT } from "@/i18n/server";

/** Side-by-side comparison of the reference frames saved for one shot. */
export default async function CompareShotPage({ params }: { params: Promise<{ id: string; shotId: string }> }) {
  const { id, shotId } = await params;
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (access.limited) notFound();
  const shot = await db.shot.findFirst({ where: { id: shotId, productionId: id }, include: { scene: true, references: { orderBy: [{ focalLength: "asc" }, { createdAt: "asc" }] } } });
  if (!shot) notFound();
  return (
    <div className="space-y-5">
      <Link href={`/production/${id}/scenes/${shot.sceneId}#shot-${shot.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> {t("Scene {n}", { n: shot.scene.number })}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">{t("Shot {code}: compare framings", { code: shot.code })}</h2>
          <p className="text-[14px] font-semibold text-muted">{shot.description}</p>
        </div>
        {access.editCreative && (
          <LinkButton href={`/viewfinder?production=${id}&scene=${shot.sceneId}&shot=${shot.id}`} variant="secondary" size="sm">
            <ScanLine className="size-4" aria-hidden /> {t("Capture another option")}
          </LinkButton>
        )}
      </div>
      {shot.references.length === 0 && <p className="text-[14px] font-semibold text-faint">{t("No reference frames yet. Capture some in the Viewfinder.")}</p>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {shot.references.map((r) => {
          const chosen = shot.preferredReferenceId === r.id;
          return (
            <article key={r.id} className={`card overflow-hidden ${chosen ? "!border-amber-bright" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/production-files/reference/${r.id}`} alt={t("Reference frame, {mm} mm", { mm: r.focalLength ?? "?" })} className="w-full bg-black" />
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xl font-black">{r.focalLength ? `${r.focalLength} mm` : "—"}</div>
                  {chosen && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-extrabold text-amber">
                      <Star className="size-3 fill-amber-bright" aria-hidden /> {t("Chosen")}
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] font-semibold text-muted">
                  {[r.cameraLabel, r.sensorLabel, r.aspect].filter(Boolean).join(" · ")} · {fmt.date(r.createdAt)}
                </p>
                {!r.calibrated && (
                  <p className="flex items-center gap-1 text-[12px] font-bold text-amber">
                    <AlertTriangle className="size-3.5" aria-hidden /> {t("Approximate framing — phone not calibrated")}
                  </p>
                )}
                {r.note && <p className="text-[13.5px] font-semibold">{r.note}</p>}
                {access.editCreative && (
                  <div className="flex flex-wrap gap-2">
                    {!chosen && (
                      <form action={choosePreferredReference.bind(null, id, shot.id, r.id)}>
                        <button className={buttonClass("amber", "sm")}>
                          <Star className="size-3.5" aria-hidden /> {t("Choose this framing")}
                        </button>
                      </form>
                    )}
                    <form action={deleteReference.bind(null, id, r.id)}>
                      <button className={`${buttonClass("ghost", "sm")} !text-danger`} aria-label={t("Delete")}>
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </form>
                  </div>
                )}
                <CommentThread productionId={id} targetType="reference" targetId={r.id} canComment />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
