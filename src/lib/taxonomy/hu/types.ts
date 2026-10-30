export interface HuSkill {
  name: string;
  description: string;
  outcomes: string[];
  criteria: string[];
  levels: [string, string, string, string, string];
  exercises: string[];
}

/** Compact helper: s(name, description, outcomes, criteria, levels, exercises). */
export function s(
  name: string,
  description: string,
  outcomes: string[],
  criteria: string[],
  levels: [string, string, string, string, string],
  exercises: string[],
): HuSkill {
  return { name, description, outcomes, criteria, levels, exercises };
}
