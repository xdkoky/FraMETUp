import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getTreeData } from "@/lib/services/tree";
import { SkillTree } from "@/components/skill-tree/skill-tree";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Skill Tree") };
}

export default async function SkillsPage() {
  const t = await getT();
  const user = await requireUser();
  const data = await getTreeData(user);
  return (
    <>
      <h1 className="sr-only">{t("Director skill tree")}</h1>
      <SkillTree data={data} />
    </>
  );
}
