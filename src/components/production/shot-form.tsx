import type { Shot } from "@prisma/client";
import { getT } from "@/i18n/server";
import { field, labelCls } from "./styles";
import { SHOT_ANGLES, SHOT_MOVES, SHOT_SIZES } from "@/lib/production/lifecycle";


/** The fields of a shot. Used for both creating and editing. */
export async function ShotFields({ shot }: { shot?: Partial<Shot> }) {
  const t = await getT();
  const sel = (name: string, options: string[], value?: string | null) => (
    <select name={name} defaultValue={value ?? ""} className={`${field} mt-1`}>
      <option value="">—</option>
      {[...new Set([...(value ? [value] : []), ...options])].map((o) => (
        <option key={o} value={o}>
          {t(o)}
        </option>
      ))}
    </select>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <label className={labelCls}>
        {t("Shot")}
        <input name="code" defaultValue={shot?.code ?? ""} maxLength={12} placeholder="3A" className={`${field} mt-1`} />
      </label>
      <label className={`${labelCls} sm:col-span-3`}>
        {t("Description")}
        <input name="description" defaultValue={shot?.description ?? ""} maxLength={1000} className={`${field} mt-1`} />
      </label>
      <label className={labelCls}>
        {t("Size")}
        {sel("size", SHOT_SIZES, shot?.size)}
      </label>
      <label className={labelCls}>
        {t("Angle")}
        {sel("angle", SHOT_ANGLES, shot?.angle)}
      </label>
      <label className={labelCls}>
        {t("Movement")}
        {sel("movement", SHOT_MOVES, shot?.movement)}
      </label>
      <label className={labelCls}>
        {t("Focal length (mm)")}
        <input name="focalLength" inputMode="decimal" defaultValue={shot?.focalLength ?? ""} className={`${field} mt-1`} />
      </label>
      <label className={labelCls}>
        {t("Camera")}
        <input name="cameraLabel" defaultValue={shot?.cameraLabel ?? ""} maxLength={80} className={`${field} mt-1`} />
      </label>
      <label className={labelCls}>
        {t("Sensor mode")}
        <input name="sensorLabel" defaultValue={shot?.sensorLabel ?? ""} maxLength={80} className={`${field} mt-1`} />
      </label>
      <label className={labelCls}>
        {t("Aspect ratio")}
        <input name="aspect" defaultValue={shot?.aspect ?? ""} maxLength={12} placeholder="2.39:1" className={`${field} mt-1`} />
      </label>
      <label className={labelCls}>
        {t("Setup time (min)")}
        <input name="setupMinutes" inputMode="numeric" defaultValue={shot?.setupMinutes ?? ""} className={`${field} mt-1`} />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>
        {t("Lens")}
        <input name="lens" defaultValue={shot?.lens ?? ""} maxLength={80} placeholder={t("e.g. Cooke S4/i 32mm")} className={`${field} mt-1`} />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>
        {t("Equipment")}
        <input name="equipment" defaultValue={shot?.equipment ?? ""} maxLength={600} placeholder={t("e.g. Dolly, 2 m track")} className={`${field} mt-1`} />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>
        {t("Director's intention")}
        <textarea name="intention" defaultValue={shot?.intention ?? ""} rows={2} maxLength={1000} className={`${field} mt-1`} />
      </label>
      <label className={`${labelCls} sm:col-span-2`}>
        {t("Cinematographer's notes")}
        <textarea name="dopNotes" defaultValue={shot?.dopNotes ?? ""} rows={2} maxLength={1000} className={`${field} mt-1`} />
      </label>
    </div>
  );
}
