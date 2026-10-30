import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertCanEditProject } from "@/lib/services/access";
import { Page } from "@/components/shell/page";
import { Card, PageHeader } from "@/components/ui/misc";
import { updateProject } from "../../actions";
import { ProjectForm } from "../../project-form";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await assertCanEditProject(user, id);
  const project = await db.project.findUniqueOrThrow({ where: { id } });
  return (
    <Page className="max-w-3xl">
      <PageHeader eyebrow="Edit project" title={project.title} />
      <Card className="p-6 sm:p-8">
        <ProjectForm action={updateProject.bind(null, id)} project={project} submitLabel="Save changes" />
      </Card>
    </Page>
  );
}
