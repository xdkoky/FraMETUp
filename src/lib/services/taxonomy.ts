import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { getLocale } from "@/i18n/server";
import { CATEGORIES_HU, EVIDENCE_HU, SKILLS_HU } from "@/lib/taxonomy/hu";

export interface TaxonomySkill {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  outcomes: string[];
  criteria: string[];
  evidenceTypes: string[];
  exercises: string[];
  levels: string[];
  rubricId: string;
  rubricVersion: number;
  archived: boolean;
}

export interface TaxonomyCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  order: number;
}

export interface TaxonomyEdge {
  from: string;
  to: string;
  kind: "PREREQUISITE" | "RELATED";
}

/**
 * The live taxonomy from the database (admins may have edited it), localised for
 * the current request. Hungarian text is overlaid only on skills still at their
 * seeded version — an admin-edited skill shows its edited (English) text.
 */
export const getTaxonomy = cache(async () => {
  const locale = await getLocale();
  const hu = locale === "hu";
  const [categories, skills, deps] = await Promise.all([
    db.skillCategory.findMany({ orderBy: { order: "asc" } }),
    db.skill.findMany({
      orderBy: { id: "asc" },
      include: { rubrics: { where: { isCurrent: true }, orderBy: { version: "desc" }, take: 1 } },
    }),
    db.skillDependency.findMany(),
  ]);
  const taxSkills: TaxonomySkill[] = skills
    .filter((s) => s.rubrics[0])
    .map((s) => {
      const tr = hu && s.version === 1 && s.rubrics[0].version === 1 ? SKILLS_HU[s.id] : undefined;
      return {
      id: s.id,
      categoryId: s.categoryId,
      name: tr?.name ?? s.name,
      description: tr?.description ?? s.description,
      outcomes: tr?.outcomes ?? s.outcomes,
      criteria: tr?.criteria ?? s.criteria,
      evidenceTypes: hu ? s.evidenceTypes.map((e) => EVIDENCE_HU[e] ?? e) : s.evidenceTypes,
      exercises: tr?.exercises ?? s.exercises,
      levels: tr?.levels ?? s.rubrics[0].levels,
      rubricId: s.rubrics[0].id,
      rubricVersion: s.rubrics[0].version,
      archived: Boolean(s.archivedAt),
      };
    });
  const edges: TaxonomyEdge[] = deps.map((d) => ({ from: d.fromSkillId, to: d.toSkillId, kind: d.kind }));
  const skillById = Object.fromEntries(taxSkills.map((s) => [s.id, s]));
  const localCategories: TaxonomyCategory[] = categories.map((c) =>
    hu && CATEGORIES_HU[c.id] ? { ...c, name: CATEGORIES_HU[c.id].name, description: CATEGORIES_HU[c.id].description } : c,
  );
  const categoryById = Object.fromEntries(localCategories.map((c) => [c.id, c]));
  return { categories: localCategories, skills: taxSkills, edges, skillById, categoryById };
});
