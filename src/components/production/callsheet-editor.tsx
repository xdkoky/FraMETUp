"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CallSheetData } from "@/lib/production/callsheet";
import { buttonClass } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { FormState } from "@/app/(app)/production/actions";
import { field, labelCls } from "./styles";

type Row = CallSheetData["schedule"][number];

export function CallSheetEditor({
  action,
  data,
  members,
  scenes,
  departments,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  data: CallSheetData;
  members: { id: string; name: string; roles: string }[];
  scenes: { id: string; label: string }[];
  departments: { key: string; label: string }[];
}) {
  const t = useT();
  const [state, run, pending] = useActionState(action, null);
  const [rows, setRows] = useState<Row[]>(data.schedule.length ? data.schedule : [{ time: data.generalCall, label: "", sceneId: "", minutes: 0 }]);
  const input = (name: keyof CallSheetData, label: string, ph = "", type = "text") => (
    <label className={labelCls}>
      {t(label)}
      <input name={name} type={type} defaultValue={String(data[name] ?? "")} placeholder={ph ? t(ph) : ""} className={`${field} mt-1`} />
    </label>
  );
  const area = (name: keyof CallSheetData, label: string, ph = "") => (
    <label className={labelCls}>
      {t(label)}
      <textarea name={name} defaultValue={String(data[name] ?? "")} rows={2} placeholder={ph ? t(ph) : ""} className={`${field} mt-1`} />
    </label>
  );
  return (
    <form action={run} className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        {input("date", "Date", "", "date")}
        {input("generalCall", "General crew call", "08:00")}
        {input("weather", "Weather", "e.g. Indoor studio")}
        {input("location", "Location")}
        <div className="sm:col-span-2">{input("address", "Address")}</div>
        {area("parking", "Parking & arrival", "e.g. Enter via the courtyard; no parking on site")}
        {area("meals", "Meal breaks", "e.g. Lunch 13:00–13:45")}
        {area("equipment", "Equipment", "e.g. ALEXA Mini, 25/35/50 primes, 2 × 1 kW fresnel")}
      </section>

      <section>
        <h3 className="mb-2 text-[15px] font-black">{t("Scene schedule")}</h3>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_auto] gap-2 sm:grid-cols-[90px_160px_1fr_90px_auto]">
              <input name="schedTime" defaultValue={r.time} placeholder="09:00" aria-label={t("Time")} className={field} />
              <select name="schedScene" defaultValue={r.sceneId} aria-label={t("Scene")} className={`${field} hidden sm:block`}>
                <option value="">{t("No scene")}</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input name="schedLabel" defaultValue={r.label} placeholder={t("e.g. Sc 3 — blocking & lighting")} aria-label={t("What happens")} className={field} />
              <input name="schedMinutes" defaultValue={r.minutes || ""} inputMode="numeric" placeholder={t("min")} aria-label={t("Minutes")} className={`${field} hidden sm:block`} />
              <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded-lg p-2 text-faint hover:bg-surface-2" aria-label={t("Remove row")}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows([...rows, { time: "", label: "", sceneId: "", minutes: 0 }])} className={`${buttonClass("ghost", "sm")} mt-2`}>
          <Plus className="size-3.5" aria-hidden /> {t("Add row")}
        </button>
      </section>

      <section>
        <h3 className="mb-2 text-[15px] font-black">{t("Individual call times")}</h3>
        <p className="mb-2 text-[12.5px] font-semibold text-faint">{t("Leave empty to use the general call.")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-2 rounded-xl border-2 border-line px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold">{m.name}</span>
                <span className="block truncate text-[12px] font-semibold text-faint">{m.roles}</span>
              </span>
              <input name={`call:${m.id}`} defaultValue={data.memberCalls[m.id] ?? ""} placeholder={data.generalCall || "08:00"} aria-label={t("Call time for {name}", { name: m.name })} className={`${field.replace("w-full", "")} w-24 shrink-0`} />
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {departments.map((d) => (
          <label key={d.key} className={labelCls}>
            {t("Notes for {dept}", { dept: d.label })}
            <textarea name={`dept:${d.key}`} defaultValue={data.departments[d.key] ?? ""} rows={2} className={`${field} mt-1`} />
          </label>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {input("emergencyContact", "Emergency contact", "Name and phone")}
        {input("nearestHospital", "Nearest hospital / first aid")}
        {area("safety", "Safety notes", "e.g. Cables taped on the stairwell; stunt rehearsal at 11:00")}
        {area("notes", "General notes")}
      </section>

      <section className="rounded-2xl border-2 border-dashed border-line p-4">
        <label className={labelCls}>
          {t("What changed? (shown to the crew when you publish)")}
          <input name="changeSummary" maxLength={400} className={`${field} mt-1`} placeholder={t("e.g. Actors' call moved to 10:00")} />
        </label>
        {state?.error && <p className="mt-2 text-[13px] font-bold text-danger">{t(state.error)}</p>}
        {state?.ok && <p className="mt-2 text-[13px] font-bold text-success-strong">{t(state.ok)}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" name="intent" value="draft" disabled={pending} className={buttonClass("secondary", "md")}>
            {t("Save draft")}
          </button>
          <button type="submit" name="intent" value="publish" disabled={pending} className={buttonClass("primary", "md")}>
            {pending ? t("Saving…") : t("Publish to crew")}
          </button>
        </div>
      </section>
    </form>
  );
}
