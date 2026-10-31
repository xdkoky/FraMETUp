import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { CallSheetData, callTimeFor } from "@/lib/production/callsheet";
import { DEPARTMENT_LABEL, DEPARTMENTS, roleLabel } from "@/lib/production/roles";
import { PrintButton } from "@/components/production/print-button";
import { getT } from "@/i18n/server";

export default async function PrintCallSheet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id } = await params;
  const { v } = await searchParams;
  const t = await getT();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  const p = await db.production.findUniqueOrThrow({ where: { id } });
  const version = await db.callSheetVersion.findFirst({ where: { productionId: id, state: "PUBLISHED", ...(v ? { version: Number(v) } : {}) }, orderBy: { version: "desc" } });
  if (!version) notFound();
  const latest = await db.callSheetVersion.findFirst({ where: { productionId: id, state: "PUBLISHED" }, orderBy: { version: "desc" }, select: { version: true } });
  const d = CallSheetData.parse(version.data);
  const members = await db.productionMember.findMany({ where: { productionId: id, status: "ACCEPTED" }, orderBy: { invitedAt: "asc" } });
  const scenes = await db.scene.findMany({ where: { productionId: id }, select: { id: true, number: true, title: true } });
  const crew = access.limited ? members.filter((m) => m.id === access.member?.id || m.isManager) : members;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1>{p.title}</h1>
          <p>
            {t("Call sheet")} — {t("Version {n}", { n: version.version })}
            {latest && latest.version !== version.version && <strong> ({t("OUTDATED — current is v{n}", { n: latest.version })})</strong>}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{d.generalCall || "—"}</p>
          <p>{t("General crew call")}</p>
        </div>
      </div>
      <table style={{ marginTop: 12 }}>
        <tbody>
          <tr>
            <th>{t("Date")}</th>
            <td>{d.date}</td>
            <th>{t("Location")}</th>
            <td>
              {d.location}
              {d.address ? `, ${d.address}` : ""}
            </td>
          </tr>
          <tr>
            <th>{t("Meals")}</th>
            <td>{d.meals}</td>
            <th>{t("Weather")}</th>
            <td>{d.weather}</td>
          </tr>
          <tr>
            <th>{t("Parking & arrival")}</th>
            <td colSpan={3}>{d.parking}</td>
          </tr>
        </tbody>
      </table>
      {d.schedule.length > 0 && (
        <>
          <h2>{t("Schedule")}</h2>
          <table>
            <thead>
              <tr>
                <th>{t("Time")}</th>
                <th>{t("Scene")}</th>
                <th>{t("What happens")}</th>
                <th>{t("Minutes")}</th>
              </tr>
            </thead>
            <tbody>
              {d.schedule.map((r, i) => {
                const s = scenes.find((x) => x.id === r.sceneId);
                return (
                  <tr key={i}>
                    <td>{r.time}</td>
                    <td>{s ? `${s.number} ${s.title}` : ""}</td>
                    <td>{r.label}</td>
                    <td>{r.minutes || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      <h2>{t("Crew & call times")}</h2>
      <table>
        <thead>
          <tr>
            <th>{t("Call")}</th>
            <th>{t("Name")}</th>
            <th>{t("Role")}</th>
            {access.seeContacts && <th>{t("Phone")}</th>}
          </tr>
        </thead>
        <tbody>
          {crew.map((m) => (
            <tr key={m.id}>
              <td>{callTimeFor(d, m.id)}</td>
              <td>{m.name}</td>
              <td>{m.roles.map((r) => t(roleLabel(r))).join(", ")}</td>
              {access.seeContacts && <td>{m.phone ?? ""}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {DEPARTMENTS.some((dep) => d.departments[dep]) && (
        <>
          <h2>{t("Department notes")}</h2>
          {DEPARTMENTS.filter((dep) => d.departments[dep]).map((dep) => (
            <p key={dep}>
              <strong>{t(DEPARTMENT_LABEL[dep])}:</strong> {d.departments[dep]}
            </p>
          ))}
        </>
      )}
      {!access.limited && d.equipment && (
        <>
          <h2>{t("Equipment")}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{d.equipment}</p>
        </>
      )}
      <h2>{t("Safety & emergency")}</h2>
      <p>
        <strong>{t("Emergency contact:")}</strong> {d.emergencyContact || "—"} · <strong>{t("Nearest hospital / first aid:")}</strong> {d.nearestHospital || "—"}
      </p>
      {d.safety && <p style={{ whiteSpace: "pre-line" }}>{d.safety}</p>}
      {d.notes && (
        <>
          <h2>{t("Notes")}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{d.notes}</p>
        </>
      )}
    </div>
  );
}
