import { ACTOR_HU } from "./actor";
import { ANALYSIS_HU } from "./analysis";
import { LEADERSHIP_HU } from "./leadership";
import { PROFESSIONAL_HU } from "./professional";
import { STORY_HU } from "./story";
import { TECHNICAL_HU } from "./technical";
import { VISION_HU } from "./vision";
import { VISUAL_HU } from "./visual";
import type { HuSkill } from "./types";

export { CATEGORIES_HU, EVIDENCE_HU } from "./categories";
export { CHALLENGES_HU } from "./challenges";
export type { HuSkill };

export const SKILLS_HU: Record<string, HuSkill> = {
  ...VISUAL_HU,
  ...ACTOR_HU,
  ...STORY_HU,
  ...TECHNICAL_HU,
  ...LEADERSHIP_HU,
  ...VISION_HU,
  ...ANALYSIS_HU,
  ...PROFESSIONAL_HU,
};
