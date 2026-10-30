import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { Page } from "@/components/shell/page";
import { Card, PageHeader } from "@/components/ui/misc";
import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "Request feedback" };

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ skill?: string; project?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const taxonomy = await getTaxonomy();
  const projects = await db.project.findMany({
    where: { ownerId: user.id, deletedAt: null },
    include: { skillLinks: { select: { skillId: true } }, collaborators: { where: { userId: { not: null } }, include: { user: { select: { email: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <Page className="max-w-3xl">
      <PageHeader
        eyebrow="Feedback"
        title="Ask someone who saw you work"
        description="Choose only the skills this person had a real chance to observe. They can answer “not observed” and can decline without a reason."
      />
      <Card className="p-6 sm:p-8">
        <RequestForm
          projects={projects.map((p) => ({
            id: p.id,
            title: p.title,
            skillIds: p.skillLinks.map((l) => l.skillId),
            collaborators: p.collaborators.map((c) => ({ name: c.name, role: c.role, email: c.user!.email })),
          }))}
          skills={taxonomy.skills.filter((s) => !s.archived).map((s) => ({ id: s.id, name: s.name, categoryName: taxonomy.categoryById[s.categoryId].name }))}
          initialProjectId={sp.project}
          initialSkillId={sp.skill}
        />
      </Card>
    </Page>
  );
}
