import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, Clapperboard, Crosshair, MessagesSquare, Sprout, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { semesterForDate, semesterLabel, semesterRange } from "@/lib/semester";
import { STATE_ORDER, STATE_STYLE } from "@/lib/skill-state";
import type { ProficiencyState } from "@/lib/assessment/engine";
import { PROJECT_TYPE_LABEL, formatDate } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Timeline" };

export default async function TimelinePage() {
  const user = await requireUser();
  if (!user.enrollmentYear) {
    return (
      <Page>
        <PageHeader eyebrow="Timeline" title="Your development over time" />
        <EmptyState title="Add the year you started" action={<LinkButton href="/profile">Update profile</LinkButton>}>
          The timeline groups your work by semester, so it needs your enrollment year.
        </EmptyState>
      </Page>
    );
  }
  const enroll = user.enrollmentYear;
  const taxonomy = await getTaxonomy();
  const [snapshots, projects, reviews, reflections, goals, links, peerItems] = await Promise.all([
    db.masterySnapshot.findMany({ where: { userId: user.id }, orderBy: { computedAt: "asc" } }),
    db.project.findMany({ where: { ownerId: user.id, deletedAt: null }, orderBy: { createdAt: "asc" } }),
    db.peerReview.findMany({ where: { subjectId: user.id }, include: { items: true, request: true }, orderBy: { submittedAt: "asc" } }),
    db.reflection.findMany({ where: { userId: user.id, deletedAt: null }, include: { project: { select: { title: true } } }, orderBy: { createdAt: "asc" } }),
    db.learningGoal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    db.skillEvidenceLink.findMany({ where: { project: { ownerId: user.id, deletedAt: null } }, orderBy: { createdAt: "asc" } }),
    db.peerReviewItem.findMany({ where: { review: { subjectId: user.id }, observation: "OBSERVED_WITH_DIFFICULTY" }, include: { review: true } }),
  ]);

  const now = new Date();
  const currentSem = semesterForDate(enroll, now);
  const rank = (s: string) => STATE_ORDER.indexOf(s as ProficiencyState);

  const firstLink = new Map<string, Date>();
  for (const l of links) if (!firstLink.has(l.skillId)) firstLink.set(l.skillId, l.createdAt);

  const semesters = Array.from({ length: currentSem }, (_, i) => currentSem - i).map((sem) => {
    const { start, end } = semesterRange(enroll, sem);
    const inRange = (d: Date) => d >= start && d < end;
    // Latest snapshot state per skill at the end of this and the previous semester
    const stateAt = (t: Date) => {
      const m = new Map<string, { state: string; mastery: number | null; confidence: number }>();
      for (const s of snapshots) if (s.computedAt < t) m.set(s.skillId, s);
      return m;
    };
    const atEnd = stateAt(end < now ? end : now);
    const atStart = stateAt(start);
    const stronger: { skillId: string; from: string; to: string }[] = [];
    for (const [skillId, s] of atEnd) {
      const before = atStart.get(skillId);
      const fromRank = before ? rank(before.state) : 0;
      if (rank(s.state) > fromRank || (before && s.confidence - before.confidence > 0.1 && rank(s.state) >= fromRank && before.state !== "NOT_ASSESSED")) {
        stronger.push({ skillId, from: before?.state ?? "NOT_ASSESSED", to: s.state });
      }
    }
    const newlyPracticed = [...firstLink.entries()].filter(([, d]) => inRange(d)).map(([id]) => id);
    const growthAreas = [...new Set(peerItems.filter((p) => inRange(p.review.submittedAt)).map((p) => p.skillId))];
    const semProjects = projects.filter((p) => (p.semester ? p.semester === sem : inRange(p.startDate ?? p.createdAt)));
    return {
      sem,
      label: semesterLabel(enroll, sem),
      current: sem === currentSem,
      projects: semProjects,
      types: [...new Set(semProjects.map((p) => PROJECT_TYPE_LABEL[p.type]))],
      reviews: reviews.filter((r) => inRange(r.submittedAt)),
      reflections: reflections.filter((r) => inRange(r.createdAt)),
      goals: goals.filter((g) => inRange(g.createdAt)),
      stronger,
      newlyPracticed,
      growthAreas,
      assessedAtEnd: [...atEnd.values()].filter((s) => s.mastery !== null).length,
    };
  });

  return (
    <Page className="max-w-5xl">
      <PageHeader
        eyebrow="Longitudinal view"
        title="Timeline"
        description="Your development semester by semester. Skills don't fade just because time passes — older evidence is kept, and you can view your tree as it was at any semester."
        actions={<LinkButton href="/skills" variant="secondary">Open tree time-travel</LinkButton>}
      />
      <ol className="relative border-l border-line-soft pl-6 sm:pl-10 space-y-10">
        {semesters.map((s) => {
          const empty = !s.projects.length && !s.reviews.length && !s.reflections.length && !s.stronger.length && !s.goals.length;
          return (
            <li key={s.sem} className="relative">
              <span
                className={`absolute -left-[31px] sm:-left-[47px] top-1.5 flex size-4 items-center justify-center rounded-full border-2 ${s.current ? "border-accent bg-accent/30" : "border-line bg-ink"}`}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="font-display text-3xl">{s.label}</h2>
                {s.current && <Badge tone="accent">Now</Badge>}
                <span className="text-xs text-faint">{s.assessedAtEnd} skills with evidence</span>
                {!s.current && (
                  <Link href={`/skills`} className="text-xs text-accent hover:underline">
                    view tree →
                  </Link>
                )}
              </div>
              {empty ? (
                <p className="mt-2 text-sm text-faint">Nothing documented this semester.</p>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {s.projects.length > 0 && (
                    <Card className="p-4">
                      <div className="slate-label mb-2 flex items-center gap-1.5">
                        <Clapperboard className="size-3.5" aria-hidden /> Projects
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {s.projects.map((p) => (
                          <li key={p.id}>
                            <Link href={`/projects/${p.id}`} className="hover:text-accent-strong">
                              {p.title}
                            </Link>{" "}
                            <span className="text-xs text-faint">· {PROJECT_TYPE_LABEL[p.type]}</span>
                          </li>
                        ))}
                      </ul>
                      {s.types.length > 1 && <p className="mt-2 text-[11px] text-faint">Forms explored: {s.types.join(", ")}</p>}
                    </Card>
                  )}
                  {s.stronger.length > 0 && (
                    <Card className="p-4">
                      <div className="slate-label mb-2 flex items-center gap-1.5">
                        <TrendingUp className="size-3.5" aria-hidden /> Stronger evidence
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {s.stronger.slice(0, 8).map((x) => (
                          <li key={x.skillId} className="flex items-center justify-between gap-2">
                            <Link href={`/skills?skill=${x.skillId}`} className="truncate hover:text-accent-strong">
                              {taxonomy.skillById[x.skillId]?.name}
                            </Link>
                            <span className="text-[11px] whitespace-nowrap">
                              {x.from === x.to ? (
                                <span className="text-faint">more evidence</span>
                              ) : (
                                <span className="text-faint">{STATE_STYLE[x.from as ProficiencyState].short}</span>
                              )}
                              <ArrowUpRight className="inline size-3 mx-0.5 text-faint" aria-hidden />
                              <span style={{ color: STATE_STYLE[x.to as ProficiencyState].color }}>{STATE_STYLE[x.to as ProficiencyState].short}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                  {(s.newlyPracticed.length > 0 || s.growthAreas.length > 0) && (
                    <Card className="p-4">
                      {s.newlyPracticed.length > 0 && (
                        <>
                          <div className="slate-label mb-2 flex items-center gap-1.5">
                            <Sprout className="size-3.5" aria-hidden /> Newly practised
                          </div>
                          <p className="text-sm text-muted">{s.newlyPracticed.map((id) => taxonomy.skillById[id]?.name).join(", ")}</p>
                        </>
                      )}
                      {s.growthAreas.length > 0 && (
                        <>
                          <div className="slate-label mb-2 mt-3 flex items-center gap-1.5">
                            <Crosshair className="size-3.5" aria-hidden /> Growth areas surfaced by feedback
                          </div>
                          <p className="text-sm text-muted">{s.growthAreas.map((id) => taxonomy.skillById[id]?.name).join(", ")}</p>
                        </>
                      )}
                    </Card>
                  )}
                  {(s.reviews.length > 0 || s.reflections.length > 0 || s.goals.length > 0) && (
                    <Card className="p-4 space-y-2 text-sm">
                      {s.reviews.length > 0 && (
                        <div className="flex items-center gap-2 text-muted">
                          <MessagesSquare className="size-3.5 text-faint" aria-hidden /> {s.reviews.length} peer review{s.reviews.length > 1 ? "s" : ""} ({s.reviews.map((r) => r.request.reviewerRelation).join(", ")})
                        </div>
                      )}
                      {s.reflections.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 text-muted">
                          <BookOpenText className="size-3.5 text-faint" aria-hidden /> {r.title} <span className="text-[11px] text-faint">{formatDate(r.createdAt, { day: "numeric", month: "short" })}</span>
                        </div>
                      ))}
                      {s.goals.map((g) => (
                        <div key={g.id} className="flex items-center gap-2 text-muted">
                          <Crosshair className="size-3.5 text-faint" aria-hidden /> Goal set: {g.title}
                        </div>
                      ))}
                    </Card>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-10 text-xs text-faint">
        Snapshots record the algorithm and taxonomy version they were computed with, so past results stay interpretable if either changes.
      </p>
    </Page>
  );
}
