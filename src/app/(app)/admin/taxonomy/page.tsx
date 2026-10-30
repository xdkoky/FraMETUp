import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Page } from "@/components/shell/page";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { NewSkillForm } from "./forms";

export const metadata: Metadata = { title: "Taxonomy admin" };

export default async function TaxonomyAdmin() {
  await requireRole("ADMIN");
  const [categories, skills, version, logs] = await Promise.all([
    db.skillCategory.findMany({ orderBy: { order: "asc" } }),
    db.skill.findMany({ include: { rubrics: { where: { isCurrent: true } }, _count: { select: { selfAssessments: true, evidenceLinks: true } } }, orderBy: { name: "asc" } }),
    db.skillTaxonomyVersion.findFirst({ where: { isCurrent: true } }),
    db.auditLog.findMany({ where: { action: { startsWith: "taxonomy." } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <Page>
      <PageHeader
        eyebrow={`Administration · taxonomy v${version?.version ?? "?"}`}
        title="Skill taxonomy"
        description="Edit skill definitions and rubrics through versioned, audited changes. Historical assessments always keep the rubric they were made against."
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {categories.map((c) => (
            <Card key={c.id} className="p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className="font-mono" style={{ color: c.color }}>
                  {c.code}
                </span>
                {c.name}
              </h2>
              <ul className="mt-3 divide-y divide-line-soft">
                {skills
                  .filter((s) => s.categoryId === c.id)
                  .map((s) => (
                    <li key={s.id}>
                      <Link href={`/admin/taxonomy/${s.id}`} className="flex items-center gap-3 py-2 text-sm hover:text-accent-strong">
                        <span className={`flex-1 ${s.archivedAt ? "line-through text-faint" : ""}`}>{s.name}</span>
                        <span className="font-mono text-[11px] text-faint">{s.id}</span>
                        <Badge>v{s.version} · rubric v{s.rubrics[0]?.version ?? "–"}</Badge>
                        <span className="w-24 text-right text-[11px] text-faint">{s._count.selfAssessments + s._count.evidenceLinks} uses</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="space-y-6 lg:col-span-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Add a skill</h2>
            <div className="mt-3">
              <NewSkillForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Recent changes</h2>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              {logs.length === 0 && <li className="text-faint">No changes yet.</li>}
              {logs.map((l) => (
                <li key={l.id}>
                  <span className="font-mono text-faint">{formatDate(l.createdAt)}</span> {l.action.replace("taxonomy.", "")} · {l.targetId}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Page>
  );
}
