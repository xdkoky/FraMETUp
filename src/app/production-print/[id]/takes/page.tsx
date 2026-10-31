import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { PrintButton } from "@/components/production/print-button";
import { getT } from "@/i18n/server";

export default async function PrintTakeReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (access.limited) notFound();
  const p = await db.production.findUniqueOrThrow({ where: { id } });
  const scenes = await db.scene.findMany({ where: { productionId: id }, orderBy: [{ order: "asc" }], include: { shots: { orderBy: [{ order: "asc" }], include: { takes: { orderBy: { take: "asc" } } } } } });
  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <h1>
        {p.title} — {t("Take report")}
      </h1>
      <p>{t("★ = director's preferred take")}</p>
      {scenes.map((s) => (
        <div key={s.id}>
          <h2>
            {t("Scene {n}", { n: s.number })} {s.title}
          </h2>
          <table>
            <thead>
              <tr>
                <th>{t("Shot")}</th>
                <th>{t("Take")}</th>
                <th>★</th>
                <th>{t("Notes")}</th>
                <th>{t("Continuity")}</th>
                <th>{t("Sound")}</th>
                <th>{t("Camera")}</th>
              </tr>
            </thead>
            <tbody>
              {s.shots.flatMap((sh) =>
                sh.takes.length
                  ? sh.takes.map((tk) => (
                      <tr key={tk.id}>
                        <td>{sh.code}</td>
                        <td>{tk.take}</td>
                        <td>{tk.preferred ? "★" : ""}</td>
                        <td>{tk.notes}</td>
                        <td>{tk.continuity}</td>
                        <td>{tk.soundIssue}</td>
                        <td>{tk.cameraIssue}</td>
                      </tr>
                    ))
                  : [
                      <tr key={sh.id}>
                        <td>{sh.code}</td>
                        <td colSpan={6}>{sh.status === "SKIPPED" ? t("Skipped") : t("No takes logged")}</td>
                      </tr>,
                    ],
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
