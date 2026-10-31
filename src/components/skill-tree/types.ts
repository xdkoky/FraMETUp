import type { MasteryResult } from "@/lib/assessment/engine";
import type { LocalizedSubSkill } from "@/lib/taxonomy/subskills";

export type { LocalizedSubSkill };

export interface TreeCategory {
  id: string;
  code: string;
  name: string;
  color: string;
  description: string;
}

export interface TreeSkill {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  outcomes: string[];
  criteria: string[];
  levels: string[];
  evidenceTypes: string[];
  exercises: string[];
  subskills: LocalizedSubSkill[];
  /** Cinematography-track lessons that teach this skill. */
  lessons: { id: string; title: string; done: boolean }[];
}

export interface TreeEdge {
  from: string;
  to: string;
  kind: "PREREQUISITE" | "RELATED";
}

export type SkillStatus = Pick<
  MasteryResult,
  | "mastery"
  | "confidence"
  | "confidenceBand"
  | "state"
  | "selfReportedOnly"
  | "breakdown"
  | "missingSources"
  | "discrepancy"
  | "needsReassessment"
  | "practiced"
  | "explanation"
  | "distinctContexts"
  | "distinctReviewers"
> & { lastEvidenceAt: string | null };

export interface TimeSlice {
  key: string;
  label: string;
  states: Record<string, SkillStatus>;
}

export interface SkillExtras {
  projects: { id: string; title: string; level: number | null; relevance: string }[];
  challenges: { id: string; title: string }[];
}

/** How often each drill was logged; `today` stops double-logging on the same day. */
export type DrillPractice = Record<string, { count: number; today: boolean }>;

export interface TreeData {
  categories: TreeCategory[];
  skills: TreeSkill[];
  edges: TreeEdge[];
  positions: {
    skills: Record<string, { x: number; y: number }>;
    categories: Record<string, { x: number; y: number }>;
    radius: number;
  };
  status: Record<string, SkillStatus>;
  slices: TimeSlice[];
  recentlyImproved: string[];
  goalSkills: string[];
  extras: Record<string, SkillExtras>;
  practice: DrillPractice;
  displayName: string;
  tierName: string;
}
