import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertCanEditProject } from "@/lib/services/access";
import { REFLECTION_PROMPTS } from "@/lib/reflection";
import { Page } from "@/components/shell/page";
import { Card, PageHeader } from "@/components/ui/misc";
import { saveReflection } from "../../actions";
import { ReflectionForm } from "./reflection-form";

export const metadata: Metadata = { title: "Reflect" };

export default async function ReflectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ completed?: string }> }) {
  const { id } = await params;
  const { completed } = await searchParams;
  const user = await requireUser();
  await assertCanEditProject(user, id);
  const project = await db.project.findUniqueOrThrow({ where: { id }, include: { skillLinks: { include: { skill: true } } } });
  return (
    <Page className="max-w-3xl">
      {completed && (
        <div className="mb-6 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
          Marked as completed. Take ten minutes to reflect while it&apos;s fresh — it&apos;s the most useful evidence you&apos;ll have later.
        </div>
      )}
      <PageHeader eyebrow={`Reflection · ${project.title}`} title="Look back honestly" description="Answer the prompts that matter. This is for you — private unless you choose to share it with collaborators." />
      {project.skillLinks.length > 0 && (
        <p className="mb-4 text-sm text-muted">
          Skills you linked: {project.skillLinks.map((l) => l.skill.name).join(", ")}.
        </p>
      )}
      <Card className="p-6 sm:p-8">
        <ReflectionForm action={saveReflection.bind(null, id)} prompts={[...REFLECTION_PROMPTS]} defaultTitle={`${project.title} — reflection`} />
      </Card>
    </Page>
  );
}
