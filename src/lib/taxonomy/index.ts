import { CATEGORIES, CATEGORY_BY_ID } from "./categories";
import { ACTOR_SKILLS } from "./skills-actor";
import { ANALYSIS_SKILLS } from "./skills-analysis";
import { LEADERSHIP_SKILLS } from "./skills-leadership";
import { PROFESSIONAL_SKILLS } from "./skills-professional";
import { STORY_SKILLS } from "./skills-story";
import { TECHNICAL_SKILLS } from "./skills-technical";
import { VISION_SKILLS } from "./skills-vision";
import { VISUAL_SKILLS } from "./skills-visual";
import type { SkillDef } from "./types";

export * from "./types";
export { CATEGORIES, CATEGORY_BY_ID };

/** Taxonomy version shipped with the seed. Bump when skills or rubrics change. */
export const TAXONOMY_VERSION = 1;

export const SKILLS: SkillDef[] = [
  ...VISUAL_SKILLS,
  ...ACTOR_SKILLS,
  ...STORY_SKILLS,
  ...TECHNICAL_SKILLS,
  ...LEADERSHIP_SKILLS,
  ...VISION_SKILLS,
  ...ANALYSIS_SKILLS,
  ...PROFESSIONAL_SKILLS,
];

export interface DependencyDef {
  from: string;
  to: string;
  kind: "PREREQUISITE" | "RELATED";
}

/** Flattens per-skill prerequisite/related lists into directed edges (from supports to). */
export function buildDependencies(skills: SkillDef[]): DependencyDef[] {
  const edges: DependencyDef[] = [];
  const seenRelated = new Set<string>();
  for (const skill of skills) {
    for (const pre of skill.prerequisites ?? []) {
      edges.push({ from: pre, to: skill.id, kind: "PREREQUISITE" });
    }
    for (const rel of skill.related ?? []) {
      // Related links are symmetric; store each pair once.
      const key = [skill.id, rel].sort().join("|");
      if (seenRelated.has(key)) continue;
      seenRelated.add(key);
      edges.push({ from: rel, to: skill.id, kind: "RELATED" });
    }
  }
  return edges;
}

export const DEPENDENCIES = buildDependencies(SKILLS);
