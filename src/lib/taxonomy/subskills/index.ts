import { ACTOR_SUBS } from "./actor";
import { ANALYSIS_SUBS } from "./analysis";
import { LEADERSHIP_SUBS } from "./leadership";
import { PROFESSIONAL_SUBS } from "./professional";
import { STORY_SUBS } from "./story";
import { TECHNICAL_SUBS } from "./technical";
import type { SubSkill } from "./types";
import { VISION_SUBS } from "./vision";
import { VISUAL_SUBS } from "./visual";

export type { SubSkill };

/** Practisable sub-skills for every skill, keyed by skill id. */
export const SUBSKILLS: Record<string, SubSkill[]> = {
  ...VISUAL_SUBS,
  ...ACTOR_SUBS,
  ...STORY_SUBS,
  ...TECHNICAL_SUBS,
  ...LEADERSHIP_SUBS,
  ...VISION_SUBS,
  ...ANALYSIS_SUBS,
  ...PROFESSIONAL_SUBS,
};

export const SUBSKILL_BY_ID: Record<string, { skillId: string; sub: SubSkill }> = Object.fromEntries(
  Object.entries(SUBSKILLS).flatMap(([skillId, list]) => list.map((sub) => [sub.id, { skillId, sub }])),
);

export interface LocalizedSubSkill {
  id: string;
  minutes: number;
  name: string;
  what: string;
  drill: string;
}

export function localizedSubskills(skillId: string, locale: "en" | "hu"): LocalizedSubSkill[] {
  return (SUBSKILLS[skillId] ?? []).map((s) => ({ id: s.id, minutes: s.minutes, ...s[locale] }));
}
