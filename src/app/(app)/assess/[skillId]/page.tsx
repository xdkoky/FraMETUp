import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTaxonomy } from "@/lib/services/taxonomy";

import { Page } from "@/components/shell/page";
import { Card } from "@/components/ui/misc";
import { AssessForm } from "./assess-form";
import { getFormat, getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Assess a skill") };
}

export default async function AssessSkill({ params, searchParams }: { params: Promise<{ skillId: string }>; searchParams: Promise<{ next?: string }> }) {
  const fmt = await getFormat();
  const t = await getT();
  const { skillId } = await params;
  const { next } = await searchParams;
  const user = await requireUser();
  const taxonomy = await getTaxonomy();
  const skill = taxonomy.skillById[skillId];
  if (!skill) notFound();
  const category = taxonomy.categoryById[skill.categoryId];
  const [history, projects] = await Promise.all([
    db.selfAssessment.findMany({ where: { userId: user.id, skillId }, orderBy: { createdAt: "desc" }, take: 5, include: { rubric: { select: { version: true } } } }),
    db.project.findMany({ where: { ownerId: user.id, deletedAt: null }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  return (
    <Page className="max-w-3xl">
      <Link href={next === "queue" ? "/assess" : `/skills?skill=${skillId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden />{" "}{t("Back")}
      </Link>
      <div className="slate-label mb-2" style={{ color: category.color }}>
        {category.code} · {category.name}
      </div>
      <h1 className="font-display text-4xl md:text-5xl">{skill.name}</h1>
      <p className="mt-3 text-muted leading-relaxed">{skill.description}</p>
      <Card className="mt-8 p-6">
        <AssessForm skillId={skillId} levels={skill.levels} projects={projects} next={next} current={history[0]?.level} />
      </Card>
      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="slate-label mb-3">{t("Your history for this skill")}</h2>
          <ol className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="flex gap-4 rounded-lg border border-line-soft px-4 py-3 text-sm">
                <span className="font-mono text-accent">L{h.level}</span>
                <div className="flex-1">
                  <div className="text-xs text-faint">
                    {fmt.date(h.createdAt)}{" "}{t("· rubric v")}{h.rubric.version}
                  </div>
                  {h.reflection && <p className="mt-1 text-muted">{h.reflection}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </Page>
  );
}
