import { CAMERA, EXPOSURE, LENSES } from "./content-camera";
import { COMPOSITION, COVERAGE, MOVEMENT } from "./content-frame";
import { GRIP, LIGHT, SETUPS } from "./content-light";
import { COLOUR, ONSET } from "./content-pipeline";
import type { L, Lesson, Module } from "./types";

export * from "./types";

/** The Cinematography track, in learning order. */
export const COURSE: Module[] = [CAMERA, EXPOSURE, LENSES, COMPOSITION, MOVEMENT, COVERAGE, LIGHT, SETUPS, GRIP, COLOUR, ONSET];

export const ALL_LESSONS: Lesson[] = COURSE.flatMap((m) => m.lessons);

export const LESSON_BY_ID: Record<string, { lesson: Lesson; module: Module; index: number }> = Object.fromEntries(
  ALL_LESSONS.map((lesson, index) => [lesson.id, { lesson, module: COURSE.find((m) => m.lessons.includes(lesson))!, index }]),
);

export const LESSONS_BY_SKILL: Record<string, Lesson[]> = {};
for (const l of ALL_LESSONS) for (const s of l.skills) (LESSONS_BY_SKILL[s] ??= []).push(l);

export type Locale = "en" | "hu";
export const pick = (s: L, locale: Locale) => s[locale];

/** The lesson after `id` in course order, or null at the end. */
export function nextLesson(id: string): Lesson | null {
  const i = LESSON_BY_ID[id]?.index ?? -1;
  return ALL_LESSONS[i + 1] ?? null;
}

export function lessonHref(id: string) {
  return `/learn/${id}`;
}
