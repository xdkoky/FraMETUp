import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard, Plus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { semesterLabel } from "@/lib/semester";
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { getFormat, getT } from "@/i18n/server";
import { getTaxonomy } from "@/lib/services/taxonomy";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Projects") };
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { skillById } = await getTaxonomy();
  const fmt = await getFormat();
  const t = await getT();
  const user = await requireUser();
  const { link } = await searchParams;
  const [projects, shared, linkSkill] = await Promise.all([
    db.project.findMany({
      where: { ownerId: user.id, deletedAt: null },
      include: { skillLinks: { include: { skill: { select: { name: true, categoryId: true } } } }, _count: { select: { evidence: { where: { deletedAt: null } }, reflections: true, reviews: true } } },
      orderBy: [{ semester: "desc" }, { createdAt: "desc" }],
    }),
    db.project.findMany({
      where: { deletedAt: null, ownerId: { not: user.id }, collaborators: { some: { userId: user.id } }, visibility: { in: ["COLLABORATORS", "COHORT"] } },
      include: { owner: { include: { profile: true } } },
    }),
    link ? db.skill.findUnique({ where: { id: link }, select: { id: true, name: true } }) : null,
  ]);
  const categories = await db.skillCategory.findMany();
  const color = Object.fromEntries(categories.map((c) => [c.id, c.color]));

  const bySemester = new Map<string, typeof projects>();
  for (const p of projects) {
    const key = p.semester ? semesterLabel(user.enrollmentYear, p.semester, t) : t("Unscheduled");
    bySemester.set(key, [...(bySemester.get(key) ?? []), p]);
  }

  return (
    <Page>
      <PageHeader
        eyebrow={t("Portfolio")}
        title={t("Projects")}
        description={t("Every project is evidence. Link it to the skills it exercised and map it against the rubric.")}
        actions={
          <LinkButton href={linkSkill ? `/projects/new?link=${linkSkill.id}` : "/projects/new"}>
            <Plus className="size-4" aria-hidden />{" "}{t("New project")}
          </LinkButton>
        }
      />
      {linkSkill && (
        <div className="mb-6 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent-strong">
          {t("Choose a project to link to")}{" "}<strong>{linkSkill.name}</strong>{t(", or create a new one. Open a project and use “Link a skill”.")}
        </div>
      )}
      {projects.length === 0 ? (
        <EmptyState icon={<Clapperboard className="size-6" />} title={t("No projects yet")} action={<LinkButton href="/projects/new">{t("Create your first project")}</LinkButton>}>
          {t("Start with anything — a class exercise, a film analysis, a weekend experiment.")}
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {[...bySemester.entries()].map(([label, list]) => (
            <section key={label} aria-labelledby={`sem-${label}`}>
              <h2 id={`sem-${label}`} className="slate-label mb-3">
                {label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}${linkSkill ? `#link-skill` : ""}`} className="card group p-5 hover:border-line transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-faint">{t(PROJECT_TYPE_LABEL[p.type])}</span>
                      <Badge tone={p.status === "COMPLETED" ? "success" : p.status === "ABANDONED" ? "neutral" : "accent"}>{t(PROJECT_STATUS_LABEL[p.status])}</Badge>
                    </div>
                    <h3 className="mt-3 font-display text-2xl leading-tight group-hover:text-accent-strong">{p.title}</h3>
                    {p.logline && <p className="mt-1.5 text-sm text-muted line-clamp-2">{p.logline}</p>}
                    <div className="mt-4 flex flex-wrap gap-1">
                      {p.skillLinks.slice(0, 5).map((l) => (
                        <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                          <span className="size-1.5 rounded-full" style={{ background: color[l.skill.categoryId] }} aria-hidden />
                          {(skillById[l.skillId]?.name ?? l.skill.name)}
                        </span>
                      ))}
                      {p.skillLinks.length > 5 && <span className="text-[11px] text-faint px-1">+{p.skillLinks.length - 5}</span>}
                      {p.skillLinks.length === 0 && <span className="text-[11px] text-amber">{t("No skills linked yet")}</span>}
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-[11px] text-faint">
                      <span>{p._count.evidence} evidence</span>
                      <span>{p._count.reflections} reflections</span>
                      <span>{p._count.reviews} reviews</span>
                      <span className="ml-auto">{fmt.date(p.endDate ?? p.startDate ?? p.createdAt, { month: "short", year: "numeric" })}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {shared.length > 0 && (
        <section className="mt-12">
          <h2 className="slate-label mb-3 flex items-center gap-2">
            <Users className="size-3.5" aria-hidden />{" "}{t("Shared with you")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {shared.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="card block p-4 hover:border-line">
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-faint">by {p.owner.profile?.displayName}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
