/** A refined, practicable part of a skill, with one concrete drill. Bilingual. */
export interface SubSkill {
  id: string;
  minutes: number;
  en: { name: string; what: string; drill: string };
  hu: { name: string; what: string; drill: string };
}

type Txt = [name: string, what: string, drill: string];

/** subs(skillId, [minutes, en, hu], …) → SubSkill[] with stable ids `${skillId}#${n}`. */
export function subs(skillId: string, ...items: [number, Txt, Txt][]): [string, SubSkill[]] {
  return [
    skillId,
    items.map(([minutes, en, hu], i) => ({
      id: `${skillId}#${i + 1}`,
      minutes,
      en: { name: en[0], what: en[1], drill: en[2] },
      hu: { name: hu[0], what: hu[1], drill: hu[2] },
    })),
  ];
}
