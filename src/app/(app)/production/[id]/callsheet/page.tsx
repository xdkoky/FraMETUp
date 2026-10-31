import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, MapPin, Phone, Printer, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { CallSheetData, callTimeFor, departmentsFor, EMPTY_CALL_SHEET } from "@/lib/production/callsheet";
import { DEPARTMENT_LABEL, DEPARTMENTS, roleLabel, type Department } from "@/lib/production/roles";
import { Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { CallSheetEditor } from "@/components/production/callsheet-editor";
import { acknowledgeCallSheet, saveCallSheetDraft } from "../../actions";
import { getFormat, getT } from "@/i18n/server";

export default async function CallSheetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string; v?: string }> }) {
  const { id } = await params;
  const { edit, v } = await searchParams;
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  const [published, draft, members, scenes] = await Promise.all([
    db.callSheetVersion.findMany({ where: { productionId: id, state: "PUBLISHED" }, orderBy: { version: "desc" }, include: { acknowledgements: true } }),
    db.callSheetVersion.findFirst({ where: { productionId: id, state: "DRAFT" } }),
    db.productionMember.findMany({ where: { productionId: id, status: { not: "DECLINED" } }, orderBy: { invitedAt: "asc" } }),
    db.scene.findMany({ where: { productionId: id }, orderBy: [{ order: "asc" }], select: { id: true, number: true, title: true } }),
  ]);
  const latest = published[0] ?? null;
  const shown = (v ? published.find((p) => String(p.version) === v) : null) ?? latest;
  const editing = access.manage && (edit === "1" || !latest);
  const me = access.member;
  const myAck = me && latest ? latest.acknowledgements.some((a) => a.memberId === me.id) : false;
  const sceneLabel = (sid: string) => {
    const s = scenes.find((x) => x.id === sid);
    return s ? `${t("Sc")} ${s.number}${s.title ? ` — ${s.title}` : ""}` : "";
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-black">{latest ? t("Edit call sheet (draft for v{n})", { n: latest.version + 1 }) : t("Create the call sheet")}</h2>
          {latest && (
            <Link href={`/production/${id}/callsheet`} className={buttonClass("ghost", "sm")}>
              {t("Back to v{n}", { n: latest.version })}
            </Link>
          )}
        </div>
        <Card className="p-5">
          <CallSheetEditor
            action={saveCallSheetDraft.bind(null, id)}
            data={draft ? CallSheetData.parse(draft.data) : latest ? CallSheetData.parse(latest.data) : EMPTY_CALL_SHEET}
            members={members.map((m) => ({ id: m.id, name: m.name, roles: m.roles.map((r) => t(roleLabel(r))).join(", ") }))}
            scenes={scenes.map((s) => ({ id: s.id, label: `${s.number}${s.title ? ` — ${s.title}` : ""}` }))}
            departments={DEPARTMENTS.filter((d) => d !== "direction").map((d) => ({ key: d, label: t(DEPARTMENT_LABEL[d]) }))}
          />
        </Card>
      </div>
    );
  }

  if (!shown) {
    return (
      <Card className="p-6 text-center">
        <p className="text-[15px] font-semibold text-muted">{t("The call sheet hasn't been published yet. You'll get a notification when it is.")}</p>
      </Card>
    );
  }

  const data = CallSheetData.parse(shown.data);
  const isLatest = shown.id === latest?.id;
  const myDepts: Department[] = me ? departmentsFor(me.roles, me.isActor) : [];
  const deptOrder = [...myDepts, ...DEPARTMENTS.filter((d) => !myDepts.includes(d))].filter((d) => data.departments[d]);
  const visibleCrew = access.limited ? members.filter((m) => m.id === me?.id || m.isManager || m.roles.some((r) => ["director", "first_ad", "producer", "production_manager"].includes(r))) : members;
  const ackCount = latest?.acknowledgements.length ?? 0;

  return (
    <div className="space-y-4">
      {!isLatest && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-danger/40 bg-danger/10 p-3 text-[14px] font-bold text-danger">
          <AlertTriangle className="size-5" aria-hidden /> {t("You're looking at an old version (v{n}). ", { n: shown.version })}
          <Link href={`/production/${id}/callsheet`} className="underline">
            {t("Open the current version")}
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="slate-label">{me ? t("Your call time") : t("General call")}</div>
              <div className="text-5xl font-black tracking-tight">{(me ? callTimeFor(data, me.id) : data.generalCall) || "—"}</div>
              <p className="mt-1 text-[14px] font-bold text-muted">
                {data.date ? fmt.date(new Date(`${data.date}T12:00:00`)) : t("Date not set")} · {t("General call {time}", { time: data.generalCall || "—" })}
              </p>
            </div>
            <div className="text-right">
              <div className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-extrabold text-muted">
                {t("Version {n}", { n: shown.version })} · {shown.publishedAt ? fmt.date(shown.publishedAt) : ""}
              </div>
            </div>
          </div>
          {isLatest && shown.changeSummary && (
            <p className={`mt-3 rounded-xl p-3 text-[13.5px] font-bold ${shown.important ? "bg-amber-soft text-amber" : "bg-surface-2 text-muted"}`}>
              {t("What changed:")} {shown.changeSummary}
            </p>
          )}
          {isLatest && me && (
            <div className="mt-4">
              {myAck ? (
                <p className="flex items-center gap-2 text-[14px] font-extrabold text-success-strong">
                  <CheckCircle2 className="size-5" aria-hidden /> {t("You confirmed this version.")}
                </p>
              ) : (
                <form action={acknowledgeCallSheet.bind(null, id, shown.id)}>
                  <button className={buttonClass("primary", "lg", "w-full sm:w-auto")}>{t("I've read it — confirm")}</button>
                </form>
              )}
            </div>
          )}
        </Card>
        <Card className="space-y-3 p-5">
          <div className="flex items-start gap-2 text-[14px] font-bold">
            <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span>
              {data.location}
              {data.address && <span className="block font-semibold text-muted">{data.address}</span>}
            </span>
          </div>
          {data.parking && <p className="text-[13px] font-semibold text-muted whitespace-pre-line">{data.parking}</p>}
          {data.meals && (
            <p className="text-[13px] font-semibold">
              <span className="font-extrabold">{t("Meals:")}</span> {data.meals}
            </p>
          )}
          {data.weather && (
            <p className="text-[13px] font-semibold">
              <span className="font-extrabold">{t("Weather:")}</span> {data.weather}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/production-print/${id}/callsheet?v=${shown.version}`} target="_blank" className={buttonClass("secondary", "sm")}>
              <Printer className="size-3.5" aria-hidden /> {t("PDF / print")}
            </Link>
            {access.manage && (
              <Link href={`/production/${id}/callsheet?edit=1`} className={buttonClass("ghost", "sm")}>
                {t("Edit")}
              </Link>
            )}
          </div>
        </Card>
      </div>

      {data.schedule.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-black">{t("Schedule")}</h3>
          <ol className="space-y-1.5">
            {data.schedule.map((r, i) => (
              <li key={i} className="flex gap-3 rounded-xl p-2 odd:bg-surface-2">
                <span className="w-14 shrink-0 font-mono text-[14px] font-bold">{r.time || "—"}</span>
                <span className="min-w-0 flex-1 text-[14px] font-semibold">
                  {r.sceneId && <span className="mr-1 font-extrabold text-accent">{sceneLabel(r.sceneId)}</span>}
                  {r.label}
                </span>
                {r.minutes > 0 && <span className="shrink-0 text-[12px] font-bold text-faint">{t("{n} min", { n: r.minutes })}</span>}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {deptOrder.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-black">{t("Department notes")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {deptOrder.map((d) => (
              <div key={d} className={`rounded-xl border-2 p-3 ${myDepts.includes(d) ? "border-accent/50 bg-accent-soft" : "border-line"}`}>
                <div className="text-[13px] font-extrabold">
                  {t(DEPARTMENT_LABEL[d])} {myDepts.includes(d) && <span className="text-accent">· {t("you")}</span>}
                </div>
                <p className="whitespace-pre-line text-[13.5px] font-semibold">{data.departments[d]}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!access.limited && data.equipment && (
        <Card className="p-5">
          <h3 className="mb-2 text-[15px] font-black">{t("Equipment")}</h3>
          <p className="whitespace-pre-line text-[14px] font-semibold">{data.equipment}</p>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-black">{access.limited ? t("Your contacts") : t("Crew & call times")}</h3>
          {access.manage && isLatest && <span className="text-[12.5px] font-bold text-muted">{t("{a} of {b} confirmed", { a: ackCount, b: members.filter((m) => m.status === "ACCEPTED" && m.userId).length })}</span>}
        </div>
        <ul className="divide-y-2 divide-line-soft">
          {visibleCrew.map((m) => {
            const confirmed = latest?.acknowledgements.some((a) => a.memberId === m.id);
            return (
              <li key={m.id} className="flex items-center gap-3 py-2">
                <span className="w-14 shrink-0 font-mono text-[14px] font-bold">
                  <Clock className="mr-1 inline size-3.5 text-faint" aria-hidden />
                  {callTimeFor(data, m.id) || "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold">{m.name}</span>
                  <span className="block text-[12px] font-semibold text-faint">{m.roles.map((r) => t(roleLabel(r))).join(", ")}</span>
                </span>
                {access.seeContacts && m.phone && (
                  <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 text-[13px] font-bold text-accent">
                    <Phone className="size-3.5" aria-hidden /> {m.phone}
                  </a>
                )}
                {access.manage && m.userId && isLatest && (confirmed ? <CheckCircle2 className="size-4 text-success" aria-label={t("Confirmed")} /> : <span className="text-[11px] font-bold text-faint">{t("not yet")}</span>)}
              </li>
            );
          })}
        </ul>
      </Card>

      {(data.safety || data.emergencyContact || data.nearestHospital) && (
        <Card className="border-danger/30 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-[15px] font-black text-danger">
            <ShieldAlert className="size-5" aria-hidden /> {t("Safety & emergency")}
          </h3>
          {data.emergencyContact && (
            <p className="text-[14px] font-bold">
              {t("Emergency contact:")} {data.emergencyContact}
            </p>
          )}
          {data.nearestHospital && (
            <p className="text-[14px] font-semibold">
              {t("Nearest hospital / first aid:")} {data.nearestHospital}
            </p>
          )}
          {data.safety && <p className="mt-1 whitespace-pre-line text-[14px] font-semibold">{data.safety}</p>}
          <p className="mt-2 text-[12px] font-semibold text-faint">{t("Always follow the safety briefing on set.")}</p>
        </Card>
      )}

      {data.notes && (
        <Card className="p-5">
          <h3 className="mb-2 text-[15px] font-black">{t("Notes")}</h3>
          <p className="whitespace-pre-line text-[14px] font-semibold">{data.notes}</p>
        </Card>
      )}

      {published.length > 1 && (
        <Card className="p-5">
          <h3 className="mb-2 text-[15px] font-black">{t("Version history")}</h3>
          <ul className="space-y-1">
            {published.map((p) => (
              <li key={p.id} className="text-[13.5px] font-semibold">
                <Link href={`/production/${id}/callsheet?v=${p.version}`} className={p.id === shown.id ? "font-extrabold text-accent" : "text-muted hover:text-text"}>
                  v{p.version} · {p.publishedAt ? fmt.date(p.publishedAt) : ""} — {p.changeSummary}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
