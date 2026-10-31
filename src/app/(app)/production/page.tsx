import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clapperboard, ListTodo, MapPin, Plus, ScanLine } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { myInvitations, myOpenTasks, myProductions, roleExperience } from "@/lib/services/production";
import { roleInfo, roleLabel, DEPARTMENT_LABEL, DEPARTMENTS } from "@/lib/production/roles";
import { STAGE_LABEL } from "@/lib/production/lifecycle";
import { Page } from "@/components/shell/page";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { StageBadge } from "@/components/production/badges";
import { Character } from "@/components/characters/character";
import { respondInvitation } from "./actions";
import { getFormat, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Production Hub") };
}

export default async function ProductionHubPage() {
  const t = await getT();
  const fmt = await getFormat();
  const user = await requireUser();
  const [productions, invitations, tasks, exp] = await Promise.all([myProductions(user.id), myInvitations(user.id), myOpenTasks(user.id), roleExperience(user.id)]);
  const upcoming = productions.filter((p) => !["WRAPPED", "POST_PRODUCTION", "COMPLETED"].includes(p.status));
  const past = productions.filter((p) => ["WRAPPED", "POST_PRODUCTION", "COMPLETED"].includes(p.status));
  const expByDept = DEPARTMENTS.map((d) => ({ d, roles: Object.entries(exp.experience).filter(([r]) => roleInfo(r).department === d) })).filter((x) => x.roles.length);

  const card = (p: (typeof productions)[number]) => {
    const me = p.members.find((m) => m.userId === user.id);
    return (
      <Link key={p.id} href={`/production/${p.id}`} className="card block p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-black leading-snug">{p.title}</h3>
          <StageBadge stage={p.status} label={t(STAGE_LABEL[p.status])} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] font-bold text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden /> {p.shootDate ? fmt.date(p.shootDate) : t("Date not set")}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden /> {p.location}
          </span>
        </div>
        <p className="mt-2 text-[13px] font-semibold text-faint">
          {me?.roles.length ? t("You: {roles}", { roles: me.roles.map((r) => t(roleLabel(r))).join(", ") }) : t("You created this production")} ·{" "}
          {t("{n} crew", { n: p.members.filter((m) => m.status === "ACCEPTED").length })} · {t("{n} shots", { n: p._count.shots })}
        </p>
      </Link>
    );
  };

  return (
    <Page className="max-w-5xl">
      <PageHeader
        eyebrow={t("Lloyd Studio & beyond")}
        title={t("Production Hub")}
        description={t("Plan shoots, organise the crew, share call sheets and track every shot — and turn real productions into evidence for your skills.")}
        actions={
          <>
            <LinkButton href="/viewfinder" variant="secondary">
              <ScanLine className="size-4" aria-hidden /> {t("Viewfinder")}
            </LinkButton>
            <LinkButton href="/production/new">
              <Plus className="size-4" aria-hidden /> {t("New production")}
            </LinkButton>
          </>
        }
      />

      {invitations.length > 0 && (
        <Card className="mb-6 border-accent/40 p-5">
          <h2 className="mb-3 text-lg font-black">{t("Invitations")}</h2>
          <ul className="space-y-3">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-extrabold">{inv.production.title}</div>
                  <div className="text-[13px] font-semibold text-muted">
                    {inv.roles.map((r) => t(roleLabel(r))).join(", ")} · {inv.production.shootDate ? fmt.date(inv.production.shootDate) : t("Date not set")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={respondInvitation.bind(null, inv.id, true)}>
                    <button className={buttonClass("primary", "sm")}>{t("Join")}</button>
                  </form>
                  <form action={respondInvitation.bind(null, inv.id, false)}>
                    <button className={buttonClass("ghost", "sm")}>{t("Decline")}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-black">{t("Upcoming productions")}</h2>
            {upcoming.length ? (
              <div className="grid gap-3 sm:grid-cols-2">{upcoming.map(card)}</div>
            ) : (
              <EmptyState
                icon={<Character who="mira" mood="excited" className="size-24" />}
                title={t("No productions yet")}
                action={<LinkButton href="/production/new">{t("Create your first production")}</LinkButton>}
              >
                {t("Create one for your next Lloyd Studio exercise and invite your crew.")}
              </EmptyState>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-black">{t("Wrapped productions")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">{past.map(card)}</div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader eyebrow={t("Before the next shoot")} title={t("My tasks")} />
            <div className="p-5 pt-3">
              {tasks.length ? (
                <ul className="space-y-2">
                  {tasks.slice(0, 6).map((task) => (
                    <li key={task.id}>
                      <Link href={`/production/${task.production.id}/tasks#task-${task.id}`} className="flex items-start gap-2 rounded-xl p-2 hover:bg-surface-2">
                        <ListTodo className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-bold">{task.title}</span>
                          <span className="block text-[12px] font-semibold text-faint">
                            {task.production.title}
                            {task.due ? ` · ${t("due {date}", { date: fmt.date(task.due) })}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                  <CheckCircle2 className="size-4 text-success" aria-hidden /> {t("Nothing assigned to you right now.")}
                </p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader eyebrow={t("Role rotation")} title={t("My crew experience")} />
            <div className="p-5 pt-3">
              {exp.productions === 0 ? (
                <p className="text-[13px] font-semibold text-muted">{t("Roles you hold on wrapped productions appear here, so you can see which departments you haven't tried yet.")}</p>
              ) : (
                <div className="space-y-3">
                  {expByDept.map(({ d, roles }) => (
                    <div key={d}>
                      <div className="slate-label mb-1">{t(DEPARTMENT_LABEL[d])}</div>
                      <ul className="space-y-1">
                        {roles.map(([r, n]) => (
                          <li key={r} className="flex items-center justify-between text-[13.5px] font-bold">
                            <span>{t(roleLabel(r))}</span>
                            <span className="flex gap-0.5" aria-label={t("{n} productions", { n })}>
                              {Array.from({ length: Math.min(n, 6) }, (_, i) => (
                                <Clapperboard key={i} className="size-3.5 text-accent" aria-hidden />
                              ))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <p className="text-[12px] font-semibold text-faint">{t("Not tried yet: {list}", { list: DEPARTMENTS.filter((d) => d !== "cast" && !expByDept.some((x) => x.d === d)).map((d) => t(DEPARTMENT_LABEL[d])).join(", ") || "—" })}</p>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  );
}
