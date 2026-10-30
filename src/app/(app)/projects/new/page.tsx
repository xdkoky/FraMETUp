import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { semesterForDate } from "@/lib/semester";
import { Page } from "@/components/shell/page";
import { Card, PageHeader } from "@/components/ui/misc";
import { createProject } from "../actions";
import { ProjectForm } from "../project-form";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("New project") };
}

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const t = await getT();
  const user = await requireUser();
  const { link } = await searchParams;
  const [privacy, skill] = await Promise.all([
    db.privacySettings.findUnique({ where: { userId: user.id } }),
    link ? db.skill.findUnique({ where: { id: link }, select: { id: true, name: true } }) : null,
  ]);
  return (
    <Page className="max-w-3xl">
      <PageHeader eyebrow={t("Projects")} title={t("New project")} description={t("Document a piece of work. You'll link skills and evidence on the next screen.")} />
      <Card className="p-6 sm:p-8">
        <ProjectForm
          action={createProject}
          submitLabel={t("Create project")}
          defaultVisibility={privacy?.defaultProjectVisibility}
          defaultSemester={user.enrollmentYear ? semesterForDate(user.enrollmentYear, new Date()) : null}
          linkSkill={skill?.id}
          linkSkillName={skill?.name}
        />
      </Card>
    </Page>
  );
}
