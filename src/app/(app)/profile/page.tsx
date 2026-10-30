import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDevelopment } from "@/lib/services/development";
import { STATE_STYLE } from "@/lib/skill-state";

import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/misc";
import { GoalForm, ProfileForm } from "./forms";
import { markNotificationsRead, setGoalStatus } from "./actions";
import { getFormat, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Profile") };
}

export default async function ProfilePage() {
  const fmt = await getFormat();
  const t = await getT();
  const user = await requireUser();
  const [profile, goals, notifications, dev, counts] = await Promise.all([
    db.userProfile.findUniqueOrThrow({ where: { userId: user.id } }),
    db.learningGoal.findMany({ where: { userId: user.id }, include: { skills: true }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12 }),
    getDevelopment(user.id),
    Promise.all([
      db.project.count({ where: { ownerId: user.id, deletedAt: null } }),
      db.peerReview.count({ where: { subjectId: user.id } }),
      db.peerReview.count({ where: { reviewerId: user.id } }),
      db.reflection.count({ where: { userId: user.id, deletedAt: null } }),
    ]),
  ]);
  const { taxonomy, mastery } = dev;
  const unread = notifications.filter((n) => !n.readAt).length;
  const KIND_TITLE: Record<string, string> = {
    REVIEW_REQUESTED: "New feedback request",
    REVIEW_RECEIVED: "You received new feedback",
    REVIEW_DECLINED: "A feedback request was declined",
  };
  // Stored titles are English; known kinds get a translated title.
  const notificationTitle = (kind: string, stored: string) => (locale === "en" || !KIND_TITLE[kind] ? stored : t(KIND_TITLE[kind]));
  const locale = fmt.locale;

  return (
    <Page>
      <PageHeader eyebrow={t("Profile")} title={profile.displayName} description={profile.bio ?? t("Add a few words about your practice.")} />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t("Projects"), counts[0]],
          [t("Reviews received"), counts[1]],
          [t("Reviews given"), counts[2]],
          [t("Reflections"), counts[3]],
        ].map(([k, v]) => (
          <Card key={k as string} className="px-4 py-3">
            <div className="slate-label">{k}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader eyebrow={t("Visible only per your privacy settings")} title={t("About you")} />
          <div className="p-5">
            <ProfileForm profile={profile} categories={taxonomy.categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))} />
          </div>
        </Card>
        <div className="space-y-6 lg:col-span-7">
          <Card id="goals" className="scroll-mt-20">
            <CardHeader eyebrow={t("Direction")} title={t("Learning goals")} />
            <div className="p-5 space-y-4">
              {goals.length === 0 && <p className="text-sm text-faint">{t("No goals yet.")}</p>}
              {goals.map((g) => (
                <div key={g.id} className={`rounded-xl border border-line-soft p-4 ${g.status !== "ACTIVE" ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{g.title}</div>
                      {g.description && <p className="mt-0.5 text-xs text-muted">{g.description}</p>}
                    </div>
                    <Badge tone={g.status === "ACHIEVED" ? "success" : g.status === "ACTIVE" ? "accent" : "neutral"}>{t(g.status === "ACHIEVED" ? "achieved" : g.status === "ACTIVE" ? "active" : "archived")}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.skills.map((s) => {
                      const st = mastery[s.skillId]?.state ?? "NOT_ASSESSED";
                      return (
                        <Link key={s.skillId} href={`/skills?skill=${s.skillId}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-[11px] text-muted hover:text-text">
                          <span className="size-1.5 rounded-full" style={{ background: STATE_STYLE[st].color }} aria-hidden />
                          {taxonomy.skillById[s.skillId]?.name}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {g.status === "ACTIVE" ? (
                      <>
                        <form action={setGoalStatus.bind(null, g.id, "ACHIEVED")}>
                          <Button size="sm" variant="secondary">{t("Mark achieved")}</Button>
                        </form>
                        <form action={setGoalStatus.bind(null, g.id, "ARCHIVED")}>
                          <Button size="sm" variant="ghost">{t("Archive")}</Button>
                        </form>
                      </>
                    ) : (
                      <form action={setGoalStatus.bind(null, g.id, "ACTIVE")}>
                        <Button size="sm" variant="ghost">{t("Reactivate")}</Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
              <details className="rounded-xl border border-dashed border-line p-4">
                <summary className="cursor-pointer text-sm text-accent">{t("Add a goal")}</summary>
                <div className="mt-4">
                  <GoalForm skills={taxonomy.skills.map((s) => ({ id: s.id, name: s.name }))} />
                </div>
              </details>
            </div>
          </Card>
          <Card>
            <CardHeader
              eyebrow={t("Inbox")}
              title={unread ? t("Notifications ({n} new)", { n: unread }) : t("Notifications")}
              action={
                unread > 0 && (
                  <form action={markNotificationsRead}>
                    <Button size="sm" variant="ghost">{t("Mark all read")}</Button>
                  </form>
                )
              }
            />
            <div className="p-5">
              {notifications.length === 0 ? (
                <p className="text-sm text-faint">{t("No notifications.")}</p>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {notifications.map((n) => (
                    <li key={n.id} className="flex items-start gap-3 py-2.5">
                      <Bell className={`mt-0.5 size-4 ${n.readAt ? "text-faint" : "text-amber"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        {n.href ? (
                          <Link href={n.href} className="text-sm hover:text-accent-strong">
                            {notificationTitle(n.kind, n.title)}
                          </Link>
                        ) : (
                          <div className="text-sm">{notificationTitle(n.kind, n.title)}</div>
                        )}
                        {n.body && <div className="text-xs text-faint">{t(n.body)}</div>}
                      </div>
                      <span className="text-[11px] text-faint">{fmt.ago(n.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
