import { CREW_ROLES, roleInfo } from "./roles";

export type Experience = Record<string, number>;

/** Counts how many productions a student held each role in (wrapped or later only). */
export function countExperience(rows: { roles: string[] }[]): Experience {
  const out: Experience = {};
  for (const r of rows) for (const role of new Set(r.roles)) out[role] = (out[role] ?? 0) + 1;
  return out;
}

export interface Candidate {
  memberId: string;
  name: string;
  experience: Experience;
  /** Roles the student would like to try (from their interests). */
  wants?: string[];
}

export interface Suggestion {
  role: string;
  memberId: string;
  name: string;
  reasons: string[];
  score: number;
}

/**
 * Suggests who could take each open role, favouring roles a student hasn't tried yet and the
 * ones they asked for. Transparent: every suggestion lists its reasons. Never applied
 * automatically — a manager has to accept it.
 */
export function suggestCrew(openRoles: string[], candidates: Candidate[]): Suggestion[] {
  const used = new Set<string>();
  const out: Suggestion[] = [];
  for (const role of openRoles) {
    const ranked = candidates
      .filter((c) => !used.has(c.memberId))
      .map((c) => {
        const times = c.experience[role] ?? 0;
        const total = Object.values(c.experience).reduce((s, n) => s + n, 0);
        const reasons: string[] = [];
        let score = 0;
        if (times === 0) {
          score += 3;
          reasons.push("has not tried this role yet");
        } else {
          score -= times;
          reasons.push(`held this role ${times}×`);
        }
        if (c.wants?.includes(role)) {
          score += 2;
          reasons.push("asked to try it");
        }
        const sameDept = Object.keys(c.experience).filter((r) => roleInfo(r).department === roleInfo(role).department).length;
        if (sameDept === 0) {
          score += 1;
          reasons.push("new department for them");
        }
        score -= total * 0.05; // gently spread opportunities to less experienced students
        return { role, memberId: c.memberId, name: c.name, reasons, score };
      })
      .sort((a, b) => b.score - a.score);
    if (ranked[0]) {
      out.push(ranked[0]);
      used.add(ranked[0].memberId);
    }
  }
  return out;
}

export const KEY_ROLES = ["director", "dop", "first_ad", "gaffer", "sound_mixer", "production_designer", "script_supervisor", "first_ac"];
export const ALL_ROLE_KEYS = CREW_ROLES.map((r) => r.key);
