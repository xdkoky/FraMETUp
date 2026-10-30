import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getTreeData } from "@/lib/services/tree";
import { SkillTree } from "@/components/skill-tree/skill-tree";

export const metadata: Metadata = { title: "Skill Tree" };

export default async function SkillsPage() {
  const user = await requireUser();
  const data = await getTreeData(user);
  return (
    <>
      <h1 className="sr-only">Director skill tree</h1>
      <SkillTree data={data} />
    </>
  );
}
