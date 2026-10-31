import { CREW_ROLES, DEPARTMENT_LABEL, DEPARTMENTS } from "@/lib/production/roles";
import { getT } from "@/i18n/server";
import { field, labelCls } from "./styles";

/** Grouped checkboxes for crew roles plus a free-text custom role. */
export async function RolePicker({ selected = [], name = "roles" }: { selected?: string[]; name?: string }) {
  const t = await getT();
  const custom = selected.filter((r) => !CREW_ROLES.some((c) => c.key === r));
  return (
    <fieldset className="space-y-3">
      <legend className={labelCls}>{t("Roles")}</legend>
      {DEPARTMENTS.map((d) => (
        <div key={d}>
          <div className="slate-label mb-1">{t(DEPARTMENT_LABEL[d])}</div>
          <div className="flex flex-wrap gap-1.5">
            {CREW_ROLES.filter((r) => r.department === d).map((r) => (
              <label key={r.key} className="cursor-pointer">
                <input type="checkbox" name={name} value={r.key} defaultChecked={selected.includes(r.key)} className="peer sr-only" />
                <span className="inline-block rounded-xl border-2 border-line px-2.5 py-1 text-[12.5px] font-bold text-muted peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                  {t(r.label)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <label className={labelCls}>
        {t("Custom role (optional)")}
        <input name="customRole" defaultValue={custom[0] ?? ""} maxLength={60} className={`${field} mt-1`} placeholder={t("e.g. Camera & sound (combined)")} />
      </label>
    </fieldset>
  );
}
