import { Crown, Lightbulb, Phone, Trash2, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { requireProduction } from "@/lib/services/production";
import { countExperience, KEY_ROLES, suggestCrew } from "@/lib/production/rotation";
import { CREW_ROLES, DEPARTMENT_LABEL, DEPARTMENTS, roleInfo, roleLabel } from "@/lib/production/roles";
import { Card, CardHeader } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { ActionForm } from "@/components/production/forms";
import { RolePicker } from "@/components/production/role-picker";
import { field, labelCls } from "@/components/production/styles";
import { addGuest, addRoleToMember, inviteMember, removeMember, updateMember } from "../../actions";
import { getT } from "@/i18n/server";

export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const user = await requireUser();
  const { access, production } = await requireProduction(user, id);
  const members = await db.productionMember.findMany({ where: { productionId: id }, orderBy: { invitedAt: "asc" } });
  const userIds = members.map((m) => m.userId).filter((x): x is string => Boolean(x));
  const history = await db.productionMember.findMany({
    where: { userId: { in: userIds }, status: "ACCEPTED", productionId: { not: id }, production: { deletedAt: null, status: { in: ["WRAPPED", "POST_PRODUCTION", "COMPLETED"] } } },
    select: { userId: true, roles: true },
  });
  const expOf = (uid: string | null) => (uid ? countExperience(history.filter((h) => h.userId === uid)) : {});
  const active = members.filter((m) => m.status !== "DECLINED");
  const filled = new Set(active.flatMap((m) => m.roles));
  const open = KEY_ROLES.filter((r) => !filled.has(r));
  // Suggest people who don't already lead a key department on this production.
  const unassigned = active.filter((m) => m.status === "ACCEPTED" && !m.isActor && !m.roles.some((r) => KEY_ROLES.includes(r)));
  const suggestions = access.manage ? suggestCrew(open, unassigned.map((m) => ({ memberId: m.id, name: m.name, experience: expOf(m.userId) }))) : [];
  const byDept = DEPARTMENTS.map((d) => ({ d, people: active.filter((m) => m.roles.some((r) => roleInfo(r).department === d) || (d === "cast" && m.isActor)) })).filter((x) => x.people.length);
  const noRole = active.filter((m) => m.roles.length === 0 && !m.isActor);

  const person = (m: (typeof members)[number]) => {
    const exp = expOf(m.userId);
    const expText = Object.entries(exp).map(([r, n]) => `${t(roleLabel(r))} ×${n}`).join(", ");
    return (
      <li key={m.id} className="rounded-2xl border-2 border-line p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[15px] font-extrabold">
              {m.name}
              {(m.isManager || m.userId === production.createdById) && <Crown className="size-4 text-amber-bright" aria-label={t("Production manager")} />}
              {m.status === "INVITED" && <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-extrabold text-amber">{t("Invited")}</span>}
              {!m.userId && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-extrabold text-muted">{t("Guest")}</span>}
            </div>
            <div className="text-[13px] font-semibold text-muted">{m.roles.map((r) => t(roleLabel(r))).join(", ") || t("No role yet")}</div>
            {access.seeContacts && m.phone && (
              <a href={`tel:${m.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-bold text-accent">
                <Phone className="size-3.5" aria-hidden /> {m.phone}
              </a>
            )}
            {expText && <div className="mt-0.5 text-[12px] font-semibold text-faint">{t("Experience: {list}", { list: expText })}</div>}
          </div>
        </div>
        {(access.manage || m.userId === user.id) && (
          <details className="mt-2">
            <summary className="cursor-pointer text-[13px] font-extrabold text-accent">{access.manage ? t("Edit roles & contact") : t("Edit my phone number")}</summary>
            <form action={updateMember.bind(null, id, m.id)} className="mt-3 space-y-3">
              {access.manage && <RolePicker selected={m.roles} />}
              <label className={labelCls}>
                {t("Phone (visible to crew only)")}
                <input name="phone" defaultValue={m.phone ?? ""} maxLength={40} className={`${field} mt-1`} />
              </label>
              {access.manage && (
                <div className="flex flex-wrap gap-4 text-[13px] font-bold text-muted">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="isManager" defaultChecked={m.isManager} className="size-4 accent-[var(--color-accent)]" /> {t("Can manage the production")}
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="isActor" defaultChecked={m.isActor} className="size-4 accent-[var(--color-accent)]" /> {t("Actor (sees only their own information)")}
                  </label>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button className={buttonClass("primary", "sm")}>{t("Save")}</button>
              </div>
            </form>
            {access.manage && m.userId !== production.createdById && (
              <form action={removeMember.bind(null, id, m.id)} className="mt-2">
                <button className={`${buttonClass("ghost", "sm")} !text-danger`}>
                  <Trash2 className="size-3.5" aria-hidden /> {t("Remove from crew")}
                </button>
              </form>
            )}
          </details>
        )}
      </li>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        {byDept.map(({ d, people }) => (
          <section key={d}>
            <h2 className="slate-label mb-2">{t(DEPARTMENT_LABEL[d])}</h2>
            <ul className="space-y-2">{people.map(person)}</ul>
          </section>
        ))}
        {noRole.length > 0 && (
          <section>
            <h2 className="slate-label mb-2">{t("Without a role")}</h2>
            <ul className="space-y-2">{noRole.map(person)}</ul>
          </section>
        )}
      </div>
      {access.manage && (
        <aside className="space-y-4">
          {suggestions.length > 0 && (
            <Card>
              <CardHeader eyebrow={t("Role rotation")} title={t("Suggestions for open roles")} />
              <div className="space-y-3 p-5 pt-3">
                <p className="text-[12.5px] font-semibold text-faint">{t("Based on roles each person hasn't tried yet. Nothing changes until you accept.")}</p>
                {suggestions.map((s) => (
                  <div key={s.role} className="rounded-xl border-2 border-line p-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-bright" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-extrabold">
                          {s.name} → {t(roleLabel(s.role))}
                        </div>
                        <div className="text-[12px] font-semibold text-muted">{s.reasons.map((r) => t(r.replace(/\d+×/, "{n}×"), { n: (r.match(/\d+/) ?? ["0"])[0] })).join(" · ")}</div>
                      </div>
                    </div>
                    <form action={addRoleToMember.bind(null, id, s.memberId, s.role)} className="mt-2">
                      <button className={buttonClass("secondary", "sm")}>{t("Assign")}</button>
                    </form>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <CardHeader eyebrow={t("Students with an account")} title={t("Invite a crew member")} />
            <div className="p-5 pt-3">
              <ActionForm action={inviteMember.bind(null, id)} submit="Send invitation">
                <div className="space-y-3">
                  <label className={labelCls}>
                    {t("Email")}
                    <input name="email" type="email" required className={`${field} mt-1`} />
                  </label>
                  <RolePicker />
                  <label className="flex items-center gap-2 text-[13px] font-bold text-muted">
                    <input type="checkbox" name="isManager" className="size-4 accent-[var(--color-accent)]" /> {t("Can manage the production")}
                  </label>
                </div>
              </ActionForm>
            </div>
          </Card>
          <Card>
            <CardHeader eyebrow={t("Actors and guests without an account")} title={t("Add a guest")} />
            <div className="p-5 pt-3">
              <ActionForm action={addGuest.bind(null, id)} submit="Add">
                <div className="space-y-3">
                  <label className={labelCls}>
                    {t("Name")}
                    <input name="name" required maxLength={100} className={`${field} mt-1`} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelCls}>
                      {t("Phone")}
                      <input name="phone" maxLength={40} className={`${field} mt-1`} />
                    </label>
                    <label className={labelCls}>
                      {t("Email")}
                      <input name="email" type="email" className={`${field} mt-1`} />
                    </label>
                  </div>
                  <fieldset>
                    <legend className={labelCls}>{t("Role")}</legend>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {CREW_ROLES.filter((r) => ["actor", "production_assistant", "boom_operator", "grip"].includes(r.key)).map((r) => (
                        <label key={r.key} className="cursor-pointer">
                          <input type="checkbox" name="roles" value={r.key} defaultChecked={r.key === "actor"} className="peer sr-only" />
                          <span className="inline-block rounded-xl border-2 border-line px-2.5 py-1 text-[12.5px] font-bold text-muted peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent">{t(r.label)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </ActionForm>
            </div>
          </Card>
          <p className="flex items-start gap-2 text-[12px] font-semibold text-faint">
            <UserPlus className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("Invited students see the invitation in their Production Hub and join with one tap.")}
          </p>
        </aside>
      )}
    </div>
  );
}
