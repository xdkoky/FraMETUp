import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getTreeData } from "@/lib/services/tree";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { Page } from "@/components/shell/page";
import { SkillDetail } from "@/components/skill-tree/skill-detail";
import { Card } from "@/components/ui/misc";
import { getT } from "@/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ skillId: string }> }): Promise<Metadata> {
  const { skillId } = await params;
  const { skillById } = await getTaxonomy();
  return { title: skillById[skillId]?.name ?? skillId };
}

export default async function SkillPage({ params }: { params: Promise<{ skillId: string }> }) {
  const t = await getT();
  const { skillId } = await params;
  const user = await requireUser();
  const data = await getTreeData(user);
  const skill = data.skills.find((s) => s.id === skillId);
  if (!skill) notFound();
  const category = data.categories.find((c) => c.id === skill.categoryId)!;
  const linked = (ids: string[]) =>
    ids.map((id) => data.skills.find((s) => s.id === id)).filter(Boolean).map((s) => ({ id: s!.id, name: s!.name, state: data.status[s!.id].state }));
  const pre = data.edges.filter((e) => e.kind === "PREREQUISITE" && e.to === skillId).map((e) => e.from);
  const post = data.edges.filter((e) => e.kind === "PREREQUISITE" && e.from === skillId).map((e) => e.to);
  const rel = data.edges.filter((e) => e.kind === "RELATED" && (e.from === skillId || e.to === skillId)).map((e) => (e.from === skillId ? e.to : e.from));

  return (
    <Page className="max-w-3xl">
      <Link href={`/skills?skill=${skillId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden />{" "}{t("Show on skill tree")}
      </Link>
      <Card className="px-5 pt-6">
        <SkillDetail
          skill={skill}
          category={category}
          status={data.status[skillId]}
          prerequisites={linked(pre)}
          enables={linked(post)}
          related={linked(rel)}
          extras={data.extras[skillId] ?? { projects: [], challenges: [] }}
          isGoal={data.goalSkills.includes(skillId)}
        />
      </Card>
    </Page>
  );
}
