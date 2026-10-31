import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { Page } from "@/components/shell/page";
import { Card, PageHeader } from "@/components/ui/misc";
import { RolePicker } from "@/components/production/role-picker";
import { ActionForm } from "@/components/production/forms";
import { field, labelCls } from "@/components/production/styles";
import { createProduction } from "../actions";
import { getT } from "@/i18n/server";
import { PRODUCTION_TYPES } from "@/lib/production/lifecycle";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("New production") };
}

export default async function NewProductionPage() {
  const t = await getT();
  await requireUser();
  return (
    <Page className="max-w-2xl">
      <PageHeader eyebrow={t("Production Hub")} title={t("New production")} description={t("You can change everything later. Start with the basics and invite your crew next.")} />
      <Card className="p-5">
        <ActionForm action={createProduction} submit="Create production" resetOnOk={false}>
          <div className="space-y-4">
            <label className={labelCls}>
              {t("Title")}
              <input name="title" required maxLength={140} className={`${field} mt-1`} placeholder={t("e.g. Stairwell — dialogue exercise")} />
            </label>
            <label className={labelCls}>
              {t("Description")}
              <textarea name="description" rows={3} maxLength={3000} className={`${field} mt-1`} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>
                {t("Type")}
                <select name="type" className={`${field} mt-1`} defaultValue="Studio exercise">
                  {PRODUCTION_TYPES.map((x) => (
                    <option key={x} value={x}>
                      {t(x)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelCls}>
                {t("Location")}
                <input name="location" defaultValue="Lloyd Studio" maxLength={160} className={`${field} mt-1`} />
              </label>
              <label className={`${labelCls} sm:col-span-2`}>
                {t("Shooting date and time")}
                <input name="shootDate" type="datetime-local" className={`${field} mt-1`} />
              </label>
            </div>
            <div className="rounded-2xl border-2 border-dashed border-line p-4">
              <p className="mb-3 text-[14px] font-extrabold">{t("Your role on this production")}</p>
              <RolePicker selected={["director"]} />
            </div>
          </div>
        </ActionForm>
      </Card>
    </Page>
  );
}
