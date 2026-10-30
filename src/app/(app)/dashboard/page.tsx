import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, Clapperboard, Crosshair, MessagesSquare, NotebookPen, Plus, Sparkles, Target, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDevelopment } from "@/lib/services/development";
import { getRecommendations } from "@/lib/services/recommendations";
import { recentlyImprovedSkills } from "@/lib/services/tree";
import { semesterForDate, semesterLabel } from "@/lib/semester";
import { STATE_STYLE } from "@/lib/skill-state";
import { XP_LABEL, type XpKind } from "@/lib/xp/xp";
import { CONFIDENCE_LABEL } from "@/lib/assessment/engine";
import { CATEGORY_BY_ID } from "@/lib/taxonomy/categories";
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL, relativeTime } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, Meter } from "@/components/ui/misc";
import { DnaRadar } from "@/components/charts/dna-radar";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const dev = await getDevelopment(user.id);
  const { taxonomy, mastery, categories, totalXp, tier, assessedCount } = dev;

  const [activeProjects, pendingForMe, awaiting, goals, recentXp, unreflected, recentSnapshots, recs, improved] = await Promise.all([
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
    db.experienceEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
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
  const strongestCats = categories.filter((c) => c.mastery !== null).sort((a, b) => (b.mastery ?? 0) - (a.mastery ?? 0));

  return (
    <Page>
      {welcome && (
        <div className="mb-6 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent-strong">
          <strong className="font-semibold">You&apos;re set up.</strong> Your tree starts mostly unassessed — that&apos;s expected. Add a project or a quick
          self-assessment and watch it change.
        </div>
      )}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="slate-label mb-2">{sem && user.enrollmentYear ? semesterLabel(user.enrollmentYear, sem) : "Dashboard"}</div>
          <h1 className="font-display text-4xl md:text-5xl leading-tight">
            {greeting()}, {user.displayName.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-muted max-w-xl">
            {assessedCount === 0
              ? "Your map is a blank canvas. Every project and piece of feedback adds evidence."
              : `Evidence now supports ${assessedCount} of ${taxonomy.skills.length} skills${strongestCats[0] ? ` — your documented work is strongest in ${strongestCats[0].name.toLowerCase()}` : ""}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/assess" variant="secondary">
            Self-assess
          </LinkButton>
          <LinkButton href="/projects/new">
            <Plus className="size-4" aria-hidden /> New project
          </LinkButton>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Development overview */}
        <Card className="lg:col-span-7">
          <CardHeader eyebrow="Demonstrated ability" title="Development overview" action={<Link href="/skills" className="text-xs text-accent hover:underline">Open skill tree →</Link>} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line-soft mx-5 mt-4 rounded-xl overflow-hidden border border-line-soft">
            {[
              { k: "Skills with evidence", v: `${assessedCount}`, sub: `of ${taxonomy.skills.length}` },
              { k: "Strongly evidenced", v: `${strongly}`, sub: "broad & consistent" },
              { k: "Avg. confidence", v: CONFIDENCE_LABEL[band as keyof typeof CONFIDENCE_LABEL], sub: "across assessed skills" },
              { k: "Practised, unmapped", v: `${practicedNoEvidence}`, sub: "link to a rubric level" },
            ].map((s) => (
              <div key={s.k} className="bg-surface px-4 py-3">
                <div className="slate-label">{s.k}</div>
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
                      <div className="h-1.5 rounded-full border border-dashed border-line" title="No evidence yet" />
                    ) : (
                      <Meter value={c.mastery} color={c.color} label={`${c.name} estimate`} />
                    )}
                  </div>
                  <span className="text-right text-[11px] text-faint tabular-nums">
                    {c.assessed}/{c.total} skills
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] text-faint">
              Bars show evidence-weighted estimates over <em>assessed</em> skills only. Dashed means no evidence — not weakness.
            </p>
          </div>
        </Card>

        {/* DNA + XP */}
        <div className="lg:col-span-5 grid gap-4">
          <Card>
            <CardHeader eyebrow="Pattern, not diagnosis" title="Director DNA" action={<Link href="/dna" className="text-xs text-accent hover:underline">Explore →</Link>} />
            <div className="px-2">
              <DnaRadar height={250} data={categories.map((c) => ({ category: CATEGORY_BY_ID[c.id as keyof typeof CATEGORY_BY_ID]?.short ?? c.name, code: c.code, current: c.mastery, coverage: c.coverage }))} />
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="slate-label">Practice log · XP</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">{totalXp.toLocaleString("en-GB")}</span>
                  <span className="text-sm text-amber">{tier.name}</span>
                </div>
              </div>
              <Badge tone="amber">Activity, not ability</Badge>
            </div>
            <Meter className="mt-3" value={tier.progress * 100} color="var(--color-amber)" label="Progress to next practice tier" />
            <p className="mt-2 text-[11.5px] text-faint">
              {tier.next ? `${(tier.next.min - totalXp).toLocaleString("en-GB")} XP to ${tier.next.name}. ` : ""}XP records documented practice. It never changes your skill estimates.
            </p>
          </Card>
        </div>

        {/* Recommended challenges */}
        <Card className="lg:col-span-7">
          <CardHeader eyebrow="Personalised" title="Recommended next challenges" action={<Link href="/challenges" className="text-xs text-accent hover:underline">All challenges →</Link>} />
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
          <CardHeader eyebrow="Collaboration" title="Feedback" action={<Link href="/feedback" className="text-xs text-accent hover:underline">Open →</Link>} />
          <div className="p-5 space-y-3">
            {pendingForMe.length === 0 && awaiting === 0 ? (
              <EmptyState icon={<MessagesSquare className="size-5" />} title="No open requests">
                Ask a collaborator to review specific skills after your next project.
              </EmptyState>
            ) : (
              <>
                {pendingForMe.map((r) => (
                  <Link key={r.id} href={`/feedback/review/${r.id}`} className="flex items-center gap-3 rounded-xl border border-amber/25 bg-amber-soft px-4 py-3 hover:brightness-110">
                    <MessagesSquare className="size-4 text-amber shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text truncate">{r.requester.profile?.displayName} asked for your review</div>
                      <div className="text-xs text-muted truncate">
                        {r.project?.title ?? "General"} · {r.skills.length} skills · {relativeTime(r.createdAt)}
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-amber" aria-hidden />
                  </Link>
                ))}
                {awaiting > 0 && <p className="text-xs text-muted">{awaiting} of your requests are awaiting a response.</p>}
              </>
            )}
          </div>
        </Card>

        {/* Active projects */}
        <Card className="lg:col-span-7">
          <CardHeader eyebrow="In progress" title="Active projects" action={<Link href="/projects" className="text-xs text-accent hover:underline">All projects →</Link>} />
          <div className="p-5">
            {activeProjects.length === 0 ? (
              <EmptyState icon={<Clapperboard className="size-5" />} title="Nothing in production" action={<LinkButton href="/projects/new" size="sm">Start a project</LinkButton>}>
                Projects are your strongest source of evidence.
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
                          {PROJECT_TYPE_LABEL[p.type]} · {p._count.skillLinks} skills · {p._count.evidence} evidence items
                        </div>
                      </div>
                      <Badge>{PROJECT_STATUS_LABEL[p.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Goals */}
        <Card className="lg:col-span-5">
          <CardHeader eyebrow="Direction" title="Learning goals" action={<Link href="/profile#goals" className="text-xs text-accent hover:underline">Manage →</Link>} />
          <div className="p-5 space-y-4">
            {goals.length === 0 ? (
              <EmptyState icon={<Crosshair className="size-5" />} title="No active goals">
                Goals steer your recommendations.
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
        <Card className="lg:col-span-4">
          <CardHeader eyebrow="Last 60 days" title="Skill changes" />
          <div className="p-5">
            {recentSnapshots.length === 0 ? (
              <p className="text-sm text-faint">No recorded changes yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {recentSnapshots.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <TrendingUp className={improved.includes(s.skillId) ? "size-4 text-amber" : "size-4 text-faint"} aria-hidden />
                    <Link href={`/skills?skill=${s.skillId}`} className="flex-1 truncate hover:text-accent-strong">
                      {taxonomy.skillById[s.skillId]?.name}
                    </Link>
                    <span className="text-xs" style={{ color: STATE_STYLE[s.state as keyof typeof STATE_STYLE].color }}>
                      {STATE_STYLE[s.state as keyof typeof STATE_STYLE].short}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Reflection reminders */}
        <Card className="lg:col-span-4">
          <CardHeader eyebrow="Reflect" title="Reflection reminders" />
          <div className="p-5">
            {unreflected.length === 0 ? (
              <div className="flex gap-3 text-sm text-muted">
                <NotebookPen className="size-4 text-faint shrink-0 mt-0.5" aria-hidden />
                Every completed project has a reflection. Nice discipline.
              </div>
            ) : (
              <ul className="space-y-2">
                {unreflected.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}/reflect`} className="flex items-center gap-3 rounded-lg border border-line-soft px-3 py-2.5 text-sm hover:border-line">
                      <BookOpenText className="size-4 text-accent" aria-hidden />
                      <span className="flex-1 truncate">Reflect on {p.title}</span>
                      <ArrowRight className="size-3.5 text-faint" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Activity */}
        <Card className="lg:col-span-4">
          <CardHeader eyebrow="Practice log" title="Recent activity" />
          <div className="p-5">
            {recentXp.length === 0 ? (
              <p className="text-sm text-faint">Your activity will appear here.</p>
            ) : (
              <ul className="space-y-2.5">
                {recentXp.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 text-sm">
                    <Sparkles className="size-3.5 text-amber/80 shrink-0" aria-hidden />
                    <span className="flex-1 truncate text-muted">{XP_LABEL[e.kind as XpKind] ?? e.kind}</span>
                    <span className="font-mono text-xs text-amber">+{e.awardedXp}</span>
                    <span className="text-[11px] text-faint w-16 text-right">{relativeTime(e.createdAt)}</span>
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
