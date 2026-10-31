import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { PRODUCTION_TYPES, STAGES, STAGE_LABEL } from "@/lib/production/lifecycle";
import { Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { field, labelCls } from "@/components/production/styles";
import { deleteProduction, setProductionStatus, updateProduction } from "../../actions";
import { getT } from "@/i18n/server";

const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function ProductionSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  const p = await db.production.findUniqueOrThrow({ where: { id } });
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form action={updateProduction.bind(null, id)} className="space-y-4">
          <label className={labelCls}>
            {t("Title")}
            <input name="title" defaultValue={p.title} required maxLength={140} className={`${field} mt-1`} />
          </label>
          <label className={labelCls}>
            {t("Description")}
            <textarea name="description" defaultValue={p.description} rows={3} className={`${field} mt-1`} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelCls}>
              {t("Type")}
              <select name="type" defaultValue={p.type} className={`${field} mt-1`}>
                {[...new Set([p.type, ...PRODUCTION_TYPES])].map((x) => (
                  <option key={x} value={x}>
                    {t(x)}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              {t("Location")}
              <input name="location" defaultValue={p.location} className={`${field} mt-1`} />
            </label>
            <label className={labelCls}>
              {t("Shooting date and time")}
              <input name="shootDate" type="datetime-local" defaultValue={local(p.shootDate)} className={`${field} mt-1`} />
            </label>
          </div>
          <button className={buttonClass("primary", "md")}>{t("Save")}</button>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-black">{t("Stage")}</h2>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <form key={s} action={setProductionStatus.bind(null, id, s)}>
              <button className={buttonClass(s === p.status ? "primary" : "secondary", "sm")} aria-pressed={s === p.status}>
                {t(STAGE_LABEL[s])}
              </button>
            </form>
          ))}
        </div>
      </Card>
      {(p.createdById === user.id || user.roles.includes("ADMIN")) && (
        <Card className="border-danger/30 p-5">
          <h2 className="mb-1 text-lg font-black">{t("Delete production")}</h2>
          <p className="mb-3 text-[13px] font-semibold text-muted">{t("Hides the production for everyone. Skill evidence already added to portfolios is kept.")}</p>
          <form action={deleteProduction.bind(null, id)}>
            <button className={buttonClass("danger", "sm")}>{t("Delete production")}</button>
          </form>
        </Card>
      )}
    </div>
  );
}
