import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardHeader } from "@/components/ui/misc";
import { DependencyForm, RubricForm, SkillEditForm } from "../forms";
import { removeDependency, setSkillArchived } from "../../actions";

export const metadata: Metadata = { title: "Edit skill" };

export default async function AdminSkill({ params }: { params: Promise<{ skillId: string }> }) {
  await requireRole("ADMIN");
  const { skillId } = await params;
  const skill = await db.skill.findUnique({
    where: { id: skillId },
    include: {
      category: true,
      rubrics: { orderBy: { version: "desc" }, include: { _count: { select: { selfAssessments: true, peerReviewItems: true } } } },
      dependsOn: { include: { fromSkill: true } },
      enables: { include: { toSkill: true } },
    },
  });
  if (!skill) notFound();
  const all = await db.skill.findMany({ where: { id: { not: skillId } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const current = skill.rubrics.find((r) => r.isCurrent) ?? skill.rubrics[0];

  return (
    <Page className="max-w-5xl">
      <Link href="/admin/taxonomy" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> Taxonomy
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="slate-label" style={{ color: skill.category.color }}>
            {skill.category.code} · {skill.category.name}
          </div>
          <h1 className="font-display text-4xl">{skill.name}</h1>
          <div className="mt-1 font-mono text-xs text-faint">
            {skill.id} · v{skill.version} · updated {formatDate(skill.updatedAt)}
          </div>
        </div>
        <form action={setSkillArchived.bind(null, skill.id, !skill.archivedAt)}>
          <Button variant={skill.archivedAt ? "secondary" : "danger"} size="sm">
            {skill.archivedAt ? "Restore skill" : "Archive skill"}
          </Button>
        </form>
      </div>
      {skill.archivedAt && <p className="mb-6 rounded-lg border border-line p-3 text-sm text-muted">Archived: hidden from the tree and new assessments. Historical evidence is preserved.</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Definition" />
          <div className="p-5">
            <SkillEditForm skillId={skill.id} skill={skill} />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={`Rubric (current v${current?.version})`} />
            <div className="p-5">
              <RubricForm skillId={skill.id} levels={current?.levels ?? ["", "", "", "", ""]} />
              <div className="mt-5 border-t border-line-soft pt-4">
                <div className="slate-label mb-2">Version history</div>
                <ul className="space-y-1 text-xs text-muted">
                  {skill.rubrics.map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span>
                        v{r.version} {r.isCurrent && <Badge tone="accent">current</Badge>}
                      </span>
                      <span className="text-faint">
                        {formatDate(r.createdAt)} · {r._count.selfAssessments + r._count.peerReviewItems} assessments
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Connections" />
            <div className="p-5 space-y-4 text-sm">
              <div>
                <div className="text-xs text-faint mb-1">Builds on / related</div>
                <ul className="space-y-1">
                  {skill.dependsOn.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2">
                      <span>
                        {d.fromSkill.name} <span className="text-[11px] text-faint">({d.kind.toLowerCase()})</span>
                      </span>
                      <form action={removeDependency.bind(null, skill.id, d.id)}>
                        <button className="text-xs text-faint hover:text-danger">remove</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs text-faint mb-1">Supports</div>
                <p className="text-muted">{skill.enables.map((d) => d.toSkill.name).join(", ") || "—"}</p>
              </div>
              <DependencyForm skillId={skill.id} skills={all} />
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
