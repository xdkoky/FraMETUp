import type { Metadata } from "next";
import Link from "next/link";
import { Aperture, ArrowRight, Clapperboard, Crosshair, Flame, MessagesSquare, NotebookPen, Plus, Sparkles, Target, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDevelopment } from "@/lib/services/development";
import { getRecommendations } from "@/lib/services/recommendations";
import { recentlyImprovedSkills } from "@/lib/services/tree";
import { semesterForDate, semesterLabel } from "@/lib/semester";
import { STATE_STYLE } from "@/lib/skill-state";
import { CONFIDENCE_LABEL } from "@/lib/assessment/engine";
import { CATEGORY_BY_ID } from "@/lib/taxonomy/categories";
import { CATEGORIES_HU } from "@/lib/taxonomy/hu";
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, Meter } from "@/components/ui/misc";
import { DnaRadar } from "@/components/charts/dna-radar";
import { getFormat, getLocale, getT } from "@/i18n/server";
import { getLearnProgress } from "@/lib/services/learn";
import { ALL_LESSONS, pick } from "@/lib/learn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Dashboard") };
}

function greeting() {
  // Students are in Budapest; servers usually run in UTC.
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Budapest" }).format(new Date()));
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

async function LearnStrip({ userId }: { userId: string }) {
  const t = await getT();
  const locale = await getLocale();
  const { done, streak, activeToday } = await getLearnProgress(userId);
  const next = ALL_LESSONS.find((l) => !done.has(l.id));
  const finished = ALL_LESSONS.length - ALL_LESSONS.filter((l) => !done.has(l.id)).length;
  return (
    <Link href={next ? `/lesson/${next.id}` : "/learn"} className="card mb-6 flex items-center gap-4 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#14A89A] text-white shadow-[0_4px_0_#0d7a70]">
        <Aperture className="size-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="slate-label">{t("Cinematography track")} · {finished}/{ALL_LESSONS.length}</div>
        <div className="truncate text-[15px] font-extrabold">{next ? `${finished ? t("Continue") : t("Start")}: ${pick(next.title, locale)}` : t("Back to the path")}</div>
      </div>
      <span className={`flex shrink-0 items-center gap-1 text-lg font-black ${activeToday ? "text-amber" : "text-faint"}`} title={t("day streak")}>
        <Flame className={`size-6 ${activeToday ? "fill-amber-bright" : ""}`} aria-hidden /> {streak}
      </span>
    </Link>
  );
}

type NextStep = { icon: "feedback" | "quiz" | "project" | "reflect" | "challenge"; eyebrow: string; title: string; body: string; href: string; cta: string };

async function NextStepCard({ step }: { step: NextStep }) {
  const t = await getT();
  const Icon = { feedback: MessagesSquare, quiz: Sparkles, project: Clapperboard, reflect: NotebookPen, challenge: Target }[step.icon];
  return (
    <section className="relative mb-4 overflow-hidden rounded-[20px] border-2 border-accent/30 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(47,124,246,0.1),transparent_55%),var(--color-surface)] p-5 shadow-[0_3px_0_rgba(47,124,246,0.3)] sm:p-6" aria-label={t("Next step")}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_4px_0_var(--color-accent-strong)]">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="slate-label !text-accent-strong">{step.eyebrow}</div>
          <h2 className="mt-1 text-xl font-extrabold leading-snug">{step.title}</h2>
          <p className="mt-1 text-sm text-muted">{step.body}</p>
        </div>
        <LinkButton href={step.href} size="lg" className="shrink-0">
          {step.cta} <ArrowRight className="size-4" aria-hidden />
        </LinkButton>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line-soft pt-4">
        <LinkButton href="/projects/new" variant="secondary" size="sm">
          <Plus className="size-3.5" aria-hidden /> {t("New project")}
        </LinkButton>
        <LinkButton href="/assess" variant="secondary" size="sm">
          {t("Self-assess")}
        </LinkButton>
        <LinkButton href="/feedback/request" variant="secondary" size="sm">
          {t("Request feedback")}
        </LinkButton>
        <LinkButton href="/skills" variant="ghost" size="sm">
          {t("Open skill tree →")}
        </LinkButton>
      </div>
    </section>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const fmt = await getFormat();
  const shortName = (id: string, fallback: string) => (fmt.locale === "hu" ? CATEGORIES_HU[id]?.short : CATEGORY_BY_ID[id as keyof typeof CATEGORY_BY_ID]?.short) ?? fallback;
  const t = await getT();
  const user = await requireUser();
  const { welcome } = await searchParams;
  const dev = await getDevelopment(user.id);
  const { taxonomy, mastery, categories, totalXp, tier, assessedCount } = dev;

  const [activeProjects, pendingForMe, awaiting, goals, unreflected, recentSnapshots, recs, improved] = await Promise.all([
    db.project.findMany({
      where: { ownerId: user.id, deletedAt: null, status: { in: ["PLANNING", "IN_PRODUCTION", "POST_PRODUCTION"] } },
      include: { _count: { select: { skillLinks: true, evidence: true } } },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    db.peerReviewRequest.findMany({
      where: { reviewerId: user.id, status: "PENDING" },
      include: { requester: { include: { profile: true } }, project: { select: { title: true } }, skills: true },
      orderBy: { createdAt: "desc" },
    }),
    db.peerReviewRequest.count({ where: { requesterId: user.id, status: "PENDING" } }),
    db.learningGoal.findMany({ where: { userId: user.id, status: "ACTIVE" }, include: { skills: true }, orderBy: { createdAt: "desc" } }),
    db.project.findMany({
      where: { ownerId: user.id, deletedAt: null, status: "COMPLETED", reflections: { none: { deletedAt: null } } },
      select: { id: true, title: true },
      take: 3,
    }),
    db.masterySnapshot.findMany({
      where: { userId: user.id, computedAt: { gte: new Date(Date.now() - 60 * 86400000) } },
      orderBy: { computedAt: "desc" },
      distinct: ["skillId"],
      take: 6,
    }),
    getRecommendations(user.id, mastery, taxonomy, { limit: 3 }),
    recentlyImprovedSkills(user.id, 60),
  ]);

  const strongly = Object.values(mastery).filter((m) => m.state === "STRONGLY_EVIDENCED").length;
  const practicedNoEvidence = Object.values(mastery).filter((m) => m.practiced && m.mastery === null).length;
  const assessedResults = Object.values(mastery).filter((m) => m.mastery !== null);
  const avgConfidence = assessedResults.length ? assessedResults.reduce((s, m) => s + m.confidence, 0) / assessedResults.length : 0;
  const band = avgConfidence === 0 ? "NONE" : avgConfidence < 0.25 ? "LOW" : avgConfidence < 0.55 ? "MODERATE" : avgConfidence < 0.8 ? "GOOD" : "HIGH";
  const sem = user.enrollmentYear ? semesterForDate(user.enrollmentYear, new Date()) : null;
  const profile = await db.userProfile.findUnique({ where: { userId: user.id }, select: { quizCompletedAt: true } });
  const projectCount = await db.project.count({ where: { ownerId: user.id, deletedAt: null } });
  // One clear thing to do next, in priority order.
  const next: NextStep = pendingForMe[0]
    ? {
        icon: "feedback",
        eyebrow: t("Someone is waiting on you"),
        title: t("{name} asked for your feedback", { name: pendingForMe[0].requester.profile?.displayName ?? "" }),
        body: t("It takes about five minutes. Rate only what you actually saw."),
        href: `/feedback/review/${pendingForMe[0].id}`,
        cta: t("Give feedback"),
      }
    : !profile?.quizCompletedAt
      ? { icon: "quiz", eyebrow: t("Recommended first step"), title: t("Take the starting-point quiz"), body: t("Eleven hands-on questions give your skill tree a first shape."), href: "/quiz", cta: t("Start the quiz") }
      : projectCount === 0
        ? { icon: "project", eyebrow: t("Recommended first step"), title: t("Add your first project"), body: t("Projects are your strongest source of evidence. A class exercise is a great start."), href: "/projects/new", cta: t("New project") }
        : unreflected[0]
          ? { icon: "reflect", eyebrow: t("While it's fresh"), title: t("Reflect on {title}", { title: unreflected[0].title }), body: t("Ten honest minutes now become your most useful evidence later."), href: `/projects/${unreflected[0].id}/reflect`, cta: t("Write reflection") }
          : recs[0]
            ? { icon: "challenge", eyebrow: t("Your next challenge"), title: recs[0].challenge.title, body: recs[0].challenge.objective, href: `/challenges#${recs[0].challenge.id}`, cta: t("See the challenge") }
            : { icon: "feedback", eyebrow: t("Keep growing"), title: t("Ask a collaborator for feedback"), body: t("Peer feedback carries the most weight in your skill estimates."), href: "/feedback/request", cta: t("Request feedback") };
  const strongestCats = categories.filter((c) => c.mastery !== null).sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0));

  return (
    <Page>
      {welcome && (
        <div className="mb-6 rounded-2xl border-2 border-accent/30 bg-accent-soft p-4 text-sm text-accent-strong">
          <strong className="font-semibold">{t("You're set up.")}</strong>{" "}{t("Your tree starts mostly unassessed — that's expected. Add a project or a quick self-assessment and watch it change.")}
        </div>
      )}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="slate-label mb-2">{sem && user.enrollmentYear ? semesterLabel(user.enrollmentYear, sem, t) : t("Dashboard")}</div>
          <h1 className="font-display text-[2.1rem] md:text-[2.6rem] leading-tight">
            {t("{greeting}, {name}.", { greeting: t(greeting()), name: user.displayName.split(" ")[0] })}
          </h1>
          <p className="mt-2 text-muted max-w-xl">
            {assessedCount === 0
              ? t("Your map is a blank canvas. Every project and piece of feedback adds evidence.")
              : strongestCats[0]
                ? t("Evidence now supports {n} of {total} skills — your documented work is strongest in {area}.", { n: assessedCount, total: taxonomy.skills.length, area: strongestCats[0].name.toLowerCase() })
                : t("Evidence now supports {n} of {total} skills.", { n: assessedCount, total: taxonomy.skills.length })}
          </p>
        </div>
      </header>

      <NextStepCard step={next} />
      <LearnStrip userId={user.id} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Development overview */}
        <Card className="lg:col-span-7">
          <CardHeader eyebrow={t("Demonstrated ability")} title={t("Development overview")} action={<Link href="/skills" className="text-xs text-accent hover:underline">{t("Open skill tree →")}</Link>} />
          <div className="grid grid-cols-2 2xl:grid-cols-4 gap-px bg-line-soft mx-5 mt-4 rounded-xl overflow-hidden border border-line-soft">
            {[
              { k: t("Skills with evidence"), v: `${assessedCount}`, sub: t("of {n}", { n: taxonomy.skills.length }) },
              { k: t("Strongly evidenced"), v: `${strongly}`, sub: t("broad & consistent") },
              { k: t("Avg. confidence"), v: t(CONFIDENCE_LABEL[band as keyof typeof CONFIDENCE_LABEL]), sub: t("across assessed skills") },
              { k: t("Practised, unmapped"), v: `${practicedNoEvidence}`, sub: t("link to a rubric level") },
            ].map((s) => (
              <div key={s.k} className="bg-surface px-4 py-3">
                <div className="text-xs font-medium text-muted">{s.k}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{s.v}</div>
                <div className="text-[11px] text-faint">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 pt-4">
            <div className="space-y-2.5">
              {categories.map((c) => (
                <div key={c.id} className="grid grid-cols-[1.5rem_1fr_auto] sm:grid-cols-[1.5rem_11rem_1fr_6rem] items-center gap-3 text-sm">
                  <span className="font-mono text-xs" style={{ color: c.color }}>
                    {c.code}
                  </span>
                  <span className="truncate text-muted">{c.name}</span>
                  <div className="hidden sm:block">
                    {c.mastery === null ? (
                      <div className="h-1.5 rounded-full border border-dashed border-line" title={t("No evidence yet")} />
                    ) : (
                      <Meter value={c.mastery} color={c.color} label={`${c.name} estimate`} />
                    )}
                  </div>
                  <span className="text-right text-[11px] text-faint tabular-nums">
                    {t("{a}/{b} skills", { a: c.assessed, b: c.total })}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] text-faint">
              {t("Bars show evidence-weighted estimates over")}{" "}<em>{t("assessed")}</em>{" "}{t("skills only. Dashed means no evidence — not weakness.")}
            </p>
          </div>
        </Card>

        {/* DNA + XP */}
        <div className="lg:col-span-5 grid gap-4">
          <Card>
            <CardHeader eyebrow={t("Pattern, not diagnosis")} title={t("Director DNA")} action={<Link href="/dna" className="text-xs text-accent hover:underline">{t("Explore →")}</Link>} />
            <div className="px-2">
              <DnaRadar height={250} data={categories.map((c) => ({ category: shortName(c.id, c.name), code: c.code, current: c.mastery, coverage: c.coverage }))} />
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="slate-label">{t("Practice log · XP")}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">{fmt.number(totalXp)}</span>
                  <span className="text-sm text-amber">{t(tier.name)}</span>
                </div>
              </div>
              <Badge tone="amber">{t("Activity, not ability")}</Badge>
            </div>
            <Meter className="mt-3" value={tier.progress * 100} color="var(--color-amber)" label={t("Progress to next practice tier")} />
            <p className="mt-2 text-[11.5px] text-faint">
              {tier.next ? t("{n} XP to {tier}. ", { n: fmt.number(tier.next.min - totalXp), tier: t(tier.next.name) }) : ""}{t("XP records documented practice. It never changes your skill estimates.")}
            </p>
          </Card>
        </div>

        {/* Recommended challenges */}
        <Card className="lg:col-span-7">
          <CardHeader eyebrow={t("Personalised")} title={t("Recommended next challenges")} action={<Link href="/challenges" className="text-xs text-accent hover:underline">{t("All challenges →")}</Link>} />
          <div className="p-5 grid gap-3 md:grid-cols-3">
            {recs.map(({ challenge, reasons }) => (
              <Link key={challenge.id} href={`/challenges#${challenge.id}`} className="group rounded-xl border border-line-soft bg-ink/30 p-4 hover:border-line transition-colors">
                <div className="flex items-center justify-between">
                  <Target className="size-4 text-amber" aria-hidden />
                  <span className="font-mono text-[10px] text-faint">{"●".repeat(challenge.difficulty)}{"○".repeat(3 - challenge.difficulty)}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold group-hover:text-accent-strong">{challenge.title}</h3>
                <p className="mt-1 text-xs text-muted line-clamp-2">{challenge.objective}</p>
                <p className="mt-3 text-[11px] text-faint">{reasons[0]}</p>
              </Link>
            ))}
          </div>
        </Card>

        {/* Feedback */}
        <Card className="lg:col-span-5">
          <CardHeader eyebrow={t("Collaboration")} title={t("Feedback")} action={<Link href="/feedback" className="text-xs text-accent hover:underline">{t("Open →")}</Link>} />
          <div className="p-5 space-y-3">
            {pendingForMe.length === 0 && awaiting === 0 ? (
              <EmptyState icon={<MessagesSquare className="size-5" />} title={t("No open requests")}>
                {t("Ask a collaborator to review specific skills after your next project.")}
              </EmptyState>
            ) : (
              <>
                {pendingForMe.map((r) => (
                  <Link key={r.id} href={`/feedback/review/${r.id}`} className="flex items-center gap-3 rounded-xl border border-amber/25 bg-amber-soft px-4 py-3 hover:brightness-110">
                    <MessagesSquare className="size-4 text-amber shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text truncate">{r.requester.profile?.displayName}{" "}{t("asked for your review")}</div>
                      <div className="text-xs text-muted truncate">
                        {r.project?.title ?? t("General")} · {r.skills.length}{" "}{t("skills ·")}{" "}{fmt.ago(r.createdAt)}
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-amber" aria-hidden />
                  </Link>
                ))}
                {awaiting > 0 && <p className="text-xs text-muted">{awaiting}{" "}{t("of your requests are awaiting a response.")}</p>}
              </>
            )}
          </div>
        </Card>

        {/* Active projects */}
        <Card className="lg:col-span-7">
          <CardHeader eyebrow={t("In progress")} title={t("Active projects")} action={<Link href="/projects" className="text-xs text-accent hover:underline">{t("All projects →")}</Link>} />
          <div className="p-5">
            {activeProjects.length === 0 ? (
              <EmptyState icon={<Clapperboard className="size-5" />} title={t("Nothing in production")} action={<LinkButton href="/projects/new" size="sm">{t("Start a project")}</LinkButton>}>
                {t("Projects are your strongest source of evidence.")}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line-soft">
                {activeProjects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="flex items-center gap-4 py-3 group">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-surface-2 text-faint">
                        <Clapperboard className="size-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium group-hover:text-accent-strong truncate">{p.title}</div>
                        <div className="text-xs text-faint">
                          {t(PROJECT_TYPE_LABEL[p.type])} · {p._count.skillLinks}{" "}{t("skills ·")}{" "}{p._count.evidence}{" "}{t("evidence items")}
                        </div>
                      </div>
                      <Badge>{t(PROJECT_STATUS_LABEL[p.status])}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Goals */}
        <Card className="lg:col-span-5">
          <CardHeader eyebrow={t("Direction")} title={t("Learning goals")} action={<Link href="/profile#goals" className="text-xs text-accent hover:underline">{t("Manage →")}</Link>} />
          <div className="p-5 space-y-4">
            {goals.length === 0 ? (
              <EmptyState icon={<Crosshair className="size-5" />} title={t("No active goals")}>
                {t("Goals steer your recommendations.")}
              </EmptyState>
            ) : (
              goals.map((g) => (
                <div key={g.id}>
                  <div className="text-sm font-medium">{g.title}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.skills.map((s) => {
                      const st = mastery[s.skillId]?.state ?? "NOT_ASSESSED";
                      return (
                        <Link key={s.skillId} href={`/skills?skill=${s.skillId}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:text-text">
                          <span className="size-2 rounded-full" style={{ background: STATE_STYLE[st].color }} aria-hidden />
                          {taxonomy.skillById[s.skillId]?.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent changes */}
        <Card className="lg:col-span-12">
          <CardHeader eyebrow={t("Last 60 days")} title={t("Skill changes")} />
          <div className="p-5">
            {recentSnapshots.length === 0 ? (
              <p className="text-sm text-faint">{t("No recorded changes yet.")}</p>
            ) : (
              <ul className="space-y-2.5">
                {recentSnapshots.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <TrendingUp className={improved.includes(s.skillId) ? "size-4 text-amber" : "size-4 text-faint"} aria-hidden />
                    <Link href={`/skills?skill=${s.skillId}`} className="flex-1 truncate hover:text-accent-strong">
                      {taxonomy.skillById[s.skillId]?.name}
                    </Link>
                    <span className="text-xs" style={{ color: STATE_STYLE[s.state as keyof typeof STATE_STYLE].color }}>
                      {t(STATE_STYLE[s.state as keyof typeof STATE_STYLE].short)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

      </div>
    </Page>
  );
}
