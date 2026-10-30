export type CategoryKey =
  | "visual"
  | "actor"
  | "story"
  | "technical"
  | "leadership"
  | "vision"
  | "analysis"
  | "professional";

export interface CategoryDef {
  id: CategoryKey;
  code: string;
  name: string;
  short: string;
  description: string;
  color: string;
  order: number;
}

export interface SkillDef {
  id: string;
  categoryId: CategoryKey;
  name: string;
  description: string;
  outcomes: string[];
  criteria: string[];
  /** Five behaviourally anchored descriptors, level 1 → 5. */
  levels: [string, string, string, string, string];
  evidenceTypes: string[];
  exercises: string[];
  /** Skills that build toward this one. Guidance only — never a lock. */
  prerequisites?: string[];
  related?: string[];
}

export type SkillInput = Omit<SkillDef, "id" | "categoryId"> & { slug: string };

export function defineCategory(categoryId: CategoryKey, skills: SkillInput[]): SkillDef[] {
  return skills.map(({ slug, ...rest }) => ({ id: `${categoryId}.${slug}`, categoryId, ...rest }));
}
