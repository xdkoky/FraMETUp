import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { BUNDLED_CAMERAS, type SensorMode } from "@/lib/production/cameras";
import { cropFactor } from "@/lib/production/optics";
import { Page } from "@/components/shell/page";
import { Card, PageHeader } from "@/components/ui/misc";
import { ActionForm } from "@/components/production/forms";
import { field, labelCls } from "@/components/production/styles";
import { createCameraProfile, deleteCameraProfile } from "../actions";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Camera profiles") };
}

export default async function CamerasPage() {
  const t = await getT();
  const user = await requireUser();
  const custom = await db.cameraProfile.findMany({ where: { OR: [{ createdById: user.id }, { shared: true }] }, orderBy: { createdAt: "asc" } });
  const staff = user.roles.includes("INSTRUCTOR") || user.roles.includes("ADMIN");
  const modeRow = (m: Pick<SensorMode, "name" | "widthMm" | "heightMm">, key: string) => (
    <li key={key} className="flex flex-wrap justify-between gap-2 text-[13.5px] font-semibold">
      <span>{m.name}</span>
      <span className="font-mono text-muted">
        {m.widthMm} × {m.heightMm} mm · {t("crop ×{n}", { n: cropFactor(m).toFixed(2) })}
      </span>
    </li>
  );
  return (
    <Page className="max-w-4xl">
      <Link href="/viewfinder" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> {t("Virtual Viewfinder")}
      </Link>
      <PageHeader eyebrow={t("Virtual Viewfinder")} title={t("Camera profiles")} description={t("Sensor dimensions decide the field of view. Bundled profiles use manufacturer-published active areas; add any other camera or mode yourself.")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <p className="rounded-2xl border-2 border-amber/30 bg-amber-soft p-3 text-[13px] font-bold text-amber">{t("These are examples of supported cameras — not a list of what Lloyd Studio owns. Check with the studio which camera and recording mode you'll use.")}</p>
          {BUNDLED_CAMERAS.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[16px] font-black">
                  {c.manufacturer} {c.model}
                </h2>
                {c.source && (
                  <a href={c.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-bold text-accent">
                    {t("source")} <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}
              </div>
              <ul className="mt-2 space-y-1">{c.modes.map((m) => modeRow(m, m.key))}</ul>
            </Card>
          ))}
          {custom.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[16px] font-black">
                  {c.manufacturer} {c.model} <span className="text-[12px] font-bold text-muted">· {c.shared ? t("shared with everyone") : t("custom")}</span>
                </h2>
                {(c.createdById === user.id || user.roles.includes("ADMIN")) && (
                  <form action={deleteCameraProfile.bind(null, c.id)}>
                    <button className="rounded-lg p-1.5 text-faint hover:text-danger" aria-label={t("Delete")}>
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                )}
              </div>
              <ul className="mt-2 space-y-1">{(c.modes as unknown as SensorMode[]).map((m, i) => modeRow(m, String(i)))}</ul>
            </Card>
          ))}
        </div>
        <aside>
          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-black">{t("Add a camera")}</h2>
            <ActionForm action={createCameraProfile} submit="Save camera">
              <div className="space-y-3">
                <label className={labelCls}>
                  {t("Manufacturer")}
                  <input name="manufacturer" required maxLength={60} className={`${field} mt-1`} />
                </label>
                <label className={labelCls}>
                  {t("Model")}
                  <input name="model" required maxLength={80} className={`${field} mt-1`} />
                </label>
                <label className={labelCls}>
                  {t("Sensor modes — one per line: name; width mm; height mm")}
                  <textarea name="modes" required rows={4} className={`${field} mt-1 font-mono text-[13px]`} placeholder={"Open Gate; 28.25; 18.17\n16:9; 23.76; 13.37"} />
                </label>
                {staff && (
                  <label className="flex items-center gap-2 text-[13px] font-bold text-muted">
                    <input type="checkbox" name="shared" className="size-4 accent-[var(--color-accent)]" /> {t("Share with all students (e.g. the studio's cameras)")}
                  </label>
                )}
                <p className="text-[12px] font-semibold text-faint">{t("Use the active image area of the recording mode from the camera's official documentation.")}</p>
              </div>
            </ActionForm>
          </Card>
        </aside>
      </div>
    </Page>
  );
}
