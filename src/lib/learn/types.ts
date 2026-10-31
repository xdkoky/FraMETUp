/** A bilingual string. Course content is written in both languages side by side. */
export interface L {
  en: string;
  hu: string;
}

export const b = (en: string, hu: string): L => ({ en, hu });

/** Interactive simulators a lesson can embed. */
export type WidgetKind = "exposure" | "lens" | "lighting" | "colortemp" | "framing";

export interface Lesson {
  /** Globally unique, `<module>.<slug>`. */
  id: string;
  minutes: number;
  title: L;
  summary: L;
  /** The core ideas, each one or two sentences. */
  points: L[];
  drill: L;
  widget?: WidgetKind;
  check: { q: L; options: L[]; answer: number; why: L };
  /** Skill-tree skills this lesson builds. */
  skills: string[];
}

export interface Module {
  id: string;
  title: L;
  blurb: L;
  lessons: Lesson[];
}
