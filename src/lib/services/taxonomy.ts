import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

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

/** The live taxonomy from the database (admins may have edited it). Cached per request. */
export const getTaxonomy = cache(async () => {
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
    .map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      name: s.name,
      description: s.description,
      outcomes: s.outcomes,
      criteria: s.criteria,
      evidenceTypes: s.evidenceTypes,
      exercises: s.exercises,
      levels: s.rubrics[0].levels,
      rubricId: s.rubrics[0].id,
      rubricVersion: s.rubrics[0].version,
      archived: Boolean(s.archivedAt),
    }));
  const edges: TaxonomyEdge[] = deps.map((d) => ({ from: d.fromSkillId, to: d.toSkillId, kind: d.kind }));
  const skillById = Object.fromEntries(taxSkills.map((s) => [s.id, s]));
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  return { categories: categories as TaxonomyCategory[], skills: taxSkills, edges, skillById, categoryById };
});
