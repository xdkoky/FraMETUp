import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { productionAccess } from "@/lib/production/permissions";
import { BUNDLED_CAMERAS, type CameraProfileDef, type SensorMode } from "@/lib/production/cameras";
import { ViewfinderApp } from "@/components/viewfinder/viewfinder-app";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Virtual Viewfinder") };
}

export default async function ViewfinderPage({ searchParams }: { searchParams: Promise<{ production?: string; scene?: string; shot?: string; focal?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const [custom, calibrations, productions] = await Promise.all([
    db.cameraProfile.findMany({ where: { OR: [{ createdById: user.id }, { shared: true }] }, orderBy: { createdAt: "asc" } }),
    db.phoneCalibration.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    db.production.findMany({
      where: { deletedAt: null, OR: [{ createdById: user.id }, { members: { some: { userId: user.id, status: "ACCEPTED" } } }] },
      include: {
        members: { select: { id: true, userId: true, roles: true, isManager: true, isActor: true, status: true } },
        scenes: { orderBy: [{ order: "asc" }], select: { id: true, number: true, title: true, shots: { orderBy: [{ order: "asc" }], select: { id: true, code: true, description: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const cameras: CameraProfileDef[] = [
    ...BUNDLED_CAMERAS,
    ...custom.map((c) => ({ id: `custom-${c.id}`, manufacturer: c.manufacturer, model: c.model, custom: true, modes: (c.modes as unknown as SensorMode[]).map((m, i) => ({ ...m, key: m.key ?? `m${i}`, category: "Custom" as const })) })),
  ];
  const editable = productions
    .filter((p) => productionAccess({ id: user.id, roles: user.roles }, p).editCreative)
    .map((p) => ({ id: p.id, title: p.title, scenes: p.scenes.map((s) => ({ id: s.id, label: `${s.number}${s.title ? ` — ${s.title}` : ""}`, shots: s.shots.map((sh) => ({ id: sh.id, label: `${sh.code}${sh.description ? ` — ${sh.description.slice(0, 40)}` : ""}` })) })) }));
  return (
    <ViewfinderApp
      cameras={cameras}
      calibrations={calibrations.map((c) => ({ id: c.id, label: c.label, fov: c.longSideFovDeg }))}
      productions={editable}
      initial={{ productionId: sp.production ?? "", sceneId: sp.scene ?? "", shotId: sp.shot ?? "", focal: sp.focal ? Number(sp.focal) : null }}
    />
  );
}
