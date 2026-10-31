import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { reflectionQuestions, roleLabel, ROLE_SKILLS } from "@/lib/production/roles";
import { scheduleProgress } from "@/lib/production/schedule";
import { Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { ActionForm } from "@/components/production/forms";
import { field, labelCls } from "@/components/production/styles";
import { submitReflection, updateWrapReport } from "../../actions";
import { getFormat, getT } from "@/i18n/server";
import { getTaxonomy } from "@/lib/services/taxonomy";

export default async function WrapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const { access, production } = await requireProduction(user, id);
  if (access.limited) notFound();
  const wrapped = ["WRAPPED", "POST_PRODUCTION", "COMPLETED"].includes(production.status);
  const [scenes, wrap, members, reflections, takes, callVersions, { skillById }] = await Promise.all([
    db.scene.findMany({ where: { productionId: id }, orderBy: [{ order: "asc" }], include: { shots: { select: { status: true, setupMinutes: true, prepStartedAt: true, completedAt: true, code: true } } } }),
    db.wrapReport.findUnique({ where: { productionId: id } }),
    db.productionMember.findMany({ where: { productionId: id, status: "ACCEPTED" } }),
    db.productionReflection.findMany({ where: { productionId: id }, select: { userId: true, projectId: true } }),
    db.takeLog.findMany({ where: { productionId: id, OR: [{ soundIssue: { not: "" } }, { cameraIssue: { not: "" } }] }, include: { shot: { select: { code: true } } } }),
    db.callSheetVersion.count({ where: { productionId: id, state: "PUBLISHED" } }),
    getTaxonomy(),
  ]);
  const shots = scenes.flatMap((s) => s.shots);
  const p = scheduleProgress(shots);
  const scenesDone = scenes.filter((s) => s.shots.length && s.shots.every((x) => x.status === "COMPLETED" || x.status === "SKIPPED")).length;
  const pickups = shots.filter((s) => s.status === "PICKUP");
  const mine = reflections.find((r) => r.userId === user.id);
  const me = access.member;
  const questions = me ? reflectionQuestions(me.roles) : [];
  const skills = me ? [...new Set(me.roles.flatMap((r) => ROLE_SKILLS[r] ?? []))].map((s) => skillById[s]?.name).filter(Boolean) : [];

  if (!wrapped) {
    return (
      <Card className="flex items-center gap-3 p-6">
        <Lock className="size-6 text-faint" aria-hidden />
        <p className="text-[15px] font-semibold text-muted">{t("The wrap report and reflections open when the production is marked as wrapped.")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-black">{t("Production summary")}</h2>
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
          {[
            [t("Scenes completed"), `${scenesDone}/${scenes.length}`],
            [t("Shots completed"), `${p.completed}/${p.total}`],
            [t("Shots skipped"), String(p.skipped)],
            [t("Pickups needed"), String(pickups.length)],
            [t("Call sheet versions"), String(callVersions)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2 p-3">
              <div className="text-2xl font-black">{v}</div>
              <div className="text-[12px] font-bold text-muted">{k}</div>
            </div>
          ))}
        </div>
        {pickups.length > 0 && <p className="mt-3 text-[13.5px] font-bold text-[#8B5CF6]">{t("Outstanding pickups: {list}", { list: pickups.map((s) => s.code).join(", ") })}</p>}
        {p.deviationMinutes !== null && <p className="mt-1 text-[13px] font-semibold text-muted">{t("Completed setups took {n} min longer than planned (negative = faster).", { n: p.deviationMinutes })}</p>}
        {wrap && <p className="mt-1 text-[12px] font-semibold text-faint">{t("Wrapped on {date}", { date: fmt.date(wrap.wrappedAt) })}</p>}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-black">{t("Wrap report")}</h2>
        {access.manage ? (
          <form action={updateWrapReport.bind(null, id)} className="space-y-3">
            {(
              [
                ["notes", "Production notes", wrap?.notes],
                ["technicalProblems", "Technical problems", wrap?.technicalProblems],
                ["scheduleChanges", "Schedule changes", wrap?.scheduleChanges],
              ] as const
            ).map(([n, l, v]) => (
              <label key={n} className={labelCls}>
                {t(l)}
                <textarea name={n} defaultValue={v ?? ""} rows={3} className={`${field} mt-1`} />
              </label>
            ))}
            <button className={buttonClass("primary", "md")}>{t("Save wrap report")}</button>
          </form>
        ) : (
          <div className="space-y-2 text-[14px] font-semibold">
            {wrap?.notes && <p className="whitespace-pre-line">{wrap.notes}</p>}
            {wrap?.technicalProblems && (
              <p className="whitespace-pre-line">
                <strong>{t("Technical problems")}:</strong> {wrap.technicalProblems}
              </p>
            )}
            {wrap?.scheduleChanges && (
              <p className="whitespace-pre-line">
                <strong>{t("Schedule changes")}:</strong> {wrap.scheduleChanges}
              </p>
            )}
            {!wrap?.notes && !wrap?.technicalProblems && !wrap?.scheduleChanges && <p className="text-faint">{t("The production leads haven't written the report yet.")}</p>}
          </div>
        )}
        {takes.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-1 text-[13px] font-extrabold text-muted">{t("Issues logged during takes")}</h3>
            <ul className="space-y-0.5">
              {takes.map((tk) => (
                <li key={tk.id} className="text-[13px] font-semibold">
                  {tk.shot.code} T{tk.take}: {[tk.soundIssue && `${t("Sound:")} ${tk.soundIssue}`, tk.cameraIssue && `${t("Camera:")} ${tk.cameraIssue}`].filter(Boolean).join(" · ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-black">{t("Crew participation")}</h2>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-[14px] font-bold">
              {m.userId && reflections.some((r) => r.userId === m.userId) ? <CheckCircle2 className="size-4 text-success" aria-label={t("Reflected")} /> : <span className="size-4" />}
              {m.name} <span className="font-semibold text-muted">· {m.roles.map((r) => t(roleLabel(r))).join(", ")}</span>
            </li>
          ))}
        </ul>
      </Card>

      {me && (
        <Card className="border-accent/40 p-5">
          <h2 className="text-lg font-black">{t("Your reflection")}</h2>
          {mine ? (
            <p className="mt-2 flex items-center gap-2 text-[14px] font-bold text-success-strong">
              <CheckCircle2 className="size-5" aria-hidden /> {t("Thanks — your reflection is saved.")}
              {mine.projectId && (
                <Link href={`/projects/${mine.projectId}`} className="text-accent underline">
                  {t("Open the portfolio project")}
                </Link>
              )}
            </p>
          ) : (
            <>
              <p className="mt-1 text-[13.5px] font-semibold text-muted">{t("Short and honest beats long. These questions match your role: {roles}.", { roles: me.roles.map((r) => t(roleLabel(r))).join(", ") })}</p>
              <ActionForm action={submitReflection.bind(null, id)} submit="Save reflection" resetOnOk={false} className="mt-4">
                <div className="space-y-3">
                  {questions.map((q) => (
                    <label key={q} className={labelCls}>
                      {t(q)}
                      <input type="hidden" name="question" value={q} />
                      <textarea name="answer" rows={3} maxLength={2000} className={`${field} mt-1`} />
                    </label>
                  ))}
                  <label className="flex items-start gap-2 rounded-2xl border-2 border-line p-3 text-[13.5px] font-bold">
                    <input type="checkbox" name="addToPortfolio" defaultChecked className="mt-0.5 size-4 accent-[var(--color-accent)]" />
                    <span>
                      {t("Add this production to my portfolio as skill evidence")}
                      <span className="mt-0.5 block text-[12.5px] font-semibold text-muted">
                        {t("Links the skills your role practised ({skills}) as practice. Your level only changes after you map rubric levels and get feedback from the crew or instructors.", { skills: skills.join(", ") || "—" })}
                      </span>
                    </span>
                  </label>
                </div>
              </ActionForm>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
