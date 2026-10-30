import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertCanEditProject } from "@/lib/services/access";
import { REFLECTION_PROMPTS } from "@/lib/reflection";
import { Page } from "@/components/shell/page";
import { Card, PageHeader } from "@/components/ui/misc";
import { saveReflection } from "../../actions";
import { ReflectionForm } from "./reflection-form";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Reflect") };
}

export default async function ReflectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ completed?: string }> }) {
  const { skillById } = await getTaxonomy();
  const t = await getT();
  const { id } = await params;
  const { completed } = await searchParams;
  const user = await requireUser();
  await assertCanEditProject(user, id);
  const project = await db.project.findUniqueOrThrow({ where: { id }, include: { skillLinks: { include: { skill: true } } } });
  return (
    <Page className="max-w-3xl">
      {completed && (
        <div className="mb-6 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
          {t("Marked as completed. Take ten minutes to reflect while it's fresh — it's the most useful evidence you'll have later.")}
        </div>
      )}
      <PageHeader eyebrow={`${t("Reflection")} · ${project.title}`} title={t("Look back honestly")} description={t("Answer the prompts that matter. This is for you — private unless you choose to share it with collaborators.")} />
      {project.skillLinks.length > 0 && (
        <p className="mb-4 text-sm text-muted">
          {t("Skills you linked:")}{" "}{project.skillLinks.map((l) => (skillById[l.skillId]?.name ?? l.skill.name)).join(", ")}.
        </p>
      )}
      <Card className="p-6 sm:p-8">
        <ReflectionForm action={saveReflection.bind(null, id)} prompts={[...REFLECTION_PROMPTS]} defaultTitle={`${project.title} — reflection`} />
      </Card>
    </Page>
  );
}
