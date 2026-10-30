"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { audit } from "@/lib/services/audit";

export type AdminState = { error?: string; ok?: string } | null;

const lines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

const SkillSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1000),
  outcomes: z.array(z.string().max(300)).min(1).max(10),
  criteria: z.array(z.string().max(300)).min(1).max(10),
  evidenceTypes: z.array(z.string().max(100)).min(1).max(15),
  exercises: z.array(z.string().max(300)).max(10),
});

export async function updateSkill(skillId: string, _: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireRole("ADMIN");
  const parsed = SkillSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    outcomes: lines(formData.get("outcomes")),
    criteria: lines(formData.get("criteria")),
    evidenceTypes: lines(formData.get("evidenceTypes")),
    exercises: lines(formData.get("exercises")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const before = await db.skill.findUniqueOrThrow({ where: { id: skillId } });
  await db.skill.update({ where: { id: skillId }, data: { ...parsed.data, version: before.version + 1 } });
  await audit(admin.id, "taxonomy.skill_update", "Skill", skillId, { fromVersion: before.version, before: { name: before.name, description: before.description } });
  revalidatePath(`/admin/taxonomy/${skillId}`);
  return { ok: `Saved as skill version ${before.version + 1}.` };
}

/** Rubric edits create a new rubric version; existing assessments keep pointing at the old one. */
export async function reviseRubric(skillId: string, _: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireRole("ADMIN");
  const levels = [1, 2, 3, 4, 5].map((i) => String(formData.get(`level${i}`) ?? "").trim());
  if (levels.some((l) => l.length < 10 || l.length > 400)) return { error: "Each level needs a descriptor of 10–400 characters." };
  if (new Set(levels).size !== 5) return { error: "Level descriptors must be distinct." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const current = await db.skillRubric.findFirst({ where: { skillId, isCurrent: true }, orderBy: { version: "desc" } });
  const taxonomyVersion = await db.skillTaxonomyVersion.findFirstOrThrow({ where: { isCurrent: true } });
  const nextVersion = (current?.version ?? 0) + 1;
  await db.$transaction([
    db.skillRubric.updateMany({ where: { skillId }, data: { isCurrent: false } }),
    db.skillRubric.create({ data: { skillId, version: nextVersion, levels, taxonomyVersionId: taxonomyVersion.id, isCurrent: true, createdById: admin.id } }),
  ]);
  await audit(admin.id, "taxonomy.rubric_revise", "Skill", skillId, { version: nextVersion, note });
  revalidatePath(`/admin/taxonomy/${skillId}`);
  return { ok: `Rubric v${nextVersion} published. Earlier assessments keep their original rubric.` };
}

export async function setSkillArchived(skillId: string, archived: boolean) {
  const admin = await requireRole("ADMIN");
  await db.skill.update({ where: { id: skillId }, data: { archivedAt: archived ? new Date() : null } });
  await audit(admin.id, archived ? "taxonomy.skill_archive" : "taxonomy.skill_unarchive", "Skill", skillId);
  revalidatePath(`/admin/taxonomy/${skillId}`);
  revalidatePath("/admin/taxonomy");
}

export async function addDependency(skillId: string, _: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireRole("ADMIN");
  const fromSkillId = String(formData.get("fromSkillId") ?? "");
  const kind = formData.get("kind") === "RELATED" ? "RELATED" : "PREREQUISITE";
  if (fromSkillId === skillId) return { error: "A skill can't depend on itself." };
  if (!(await db.skill.findUnique({ where: { id: fromSkillId } }))) return { error: "Unknown skill." };
  if (kind === "PREREQUISITE") {
    // Reject edges that would create a cycle: is skillId already upstream of fromSkillId?
    const edges = await db.skillDependency.findMany({ where: { kind: "PREREQUISITE" } });
    const pre = new Map<string, string[]>();
    for (const e of edges) pre.set(e.toSkillId, [...(pre.get(e.toSkillId) ?? []), e.fromSkillId]);
    const stack = [fromSkillId];
    const seen = new Set<string>();
    while (stack.length) {
      const id = stack.pop()!;
      if (id === skillId) return { error: "That link would create a circular prerequisite." };
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...(pre.get(id) ?? []));
    }
  }
  await db.skillDependency.upsert({
    where: { fromSkillId_toSkillId_kind: { fromSkillId, toSkillId: skillId, kind } },
    create: { fromSkillId, toSkillId: skillId, kind },
    update: {},
  });
  await audit(admin.id, "taxonomy.dependency_add", "Skill", skillId, { fromSkillId, kind });
  revalidatePath(`/admin/taxonomy/${skillId}`);
  return { ok: "Link added." };
}

export async function removeDependency(skillId: string, dependencyId: string) {
  const admin = await requireRole("ADMIN");
  await db.skillDependency.delete({ where: { id: dependencyId } });
  await audit(admin.id, "taxonomy.dependency_remove", "SkillDependency", dependencyId);
  revalidatePath(`/admin/taxonomy/${skillId}`);
}

export async function createSkill(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireRole("ADMIN");
  const categoryId = String(formData.get("categoryId") ?? "");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{2,40}$/.test(slug)) return { error: "Slug: lowercase letters, numbers and dashes (3–40 chars)." };
  if (!(await db.skillCategory.findUnique({ where: { id: categoryId } }))) return { error: "Choose a category." };
  const id = `${categoryId}.${slug}`;
  if (await db.skill.findUnique({ where: { id } })) return { error: "A skill with this id already exists." };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Name is required." };
  const taxonomyVersion = await db.skillTaxonomyVersion.findFirstOrThrow({ where: { isCurrent: true } });
  await db.skill.create({
    data: {
      id,
      categoryId,
      name,
      description: "Describe this skill.",
      outcomes: ["Define an observable outcome."],
      criteria: ["Define an assessment criterion."],
      evidenceTypes: ["Reflection"],
      exercises: [],
      rubrics: {
        create: {
          version: 1,
          taxonomyVersionId: taxonomyVersion.id,
          createdById: admin.id,
          levels: ["Level 1 descriptor — edit me.", "Level 2 descriptor — edit me.", "Level 3 descriptor — edit me.", "Level 4 descriptor — edit me.", "Level 5 descriptor — edit me."],
        },
      },
    },
  });
  await audit(admin.id, "taxonomy.skill_create", "Skill", id);
  redirect(`/admin/taxonomy/${id}`);
}
