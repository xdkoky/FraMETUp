import { CAMERA, EXPOSURE, LENSES } from "./content-camera";
import { COMPOSITION, COVERAGE, MOVEMENT } from "./content-frame";
import { GRIP, LIGHT, SETUPS } from "./content-light";
import { COLOUR, ONSET } from "./content-pipeline";
import { ACTORS, SCRIPT, SHOTDESIGN, STAGING } from "./directing-1";
import { EDIT, LEADING, TONE, VOICE } from "./directing-2";
import { b, type L, type Lesson, type Module, type Track } from "./types";

export * from "./types";
export { GUIDES, REFERENCES } from "./guides";

export const DIRECTING: Track = {
  id: "directing",
  title: b("Directing", "Rendezés"),
  blurb: b("Script analysis, actors, blocking, visual storytelling, tone, leading the set, the edit and your voice.", "Forgatókönyv-elemzés, színészek, mozgásrend, képi történetmesélés, hangvétel, a forgatás vezetése, a vágás és a saját hangod."),
  modules: [SCRIPT, ACTORS, STAGING, SHOTDESIGN, TONE, LEADING, EDIT, VOICE],
};

export const CINEMATOGRAPHY: Track = {
  id: "cinematography",
  title: b("Cinematography", "Operatőri munka"),
  blurb: b("Camera, exposure, lenses, composition, movement, light and the set.", "Kamera, expozíció, objektívek, kompozíció, mozgás, fény és a forgatás."),
  modules: [CAMERA, EXPOSURE, LENSES, COMPOSITION, MOVEMENT, COVERAGE, LIGHT, SETUPS, GRIP, COLOUR, ONSET],
};

/** Directing first — it's the students' major. */
export const TRACKS: Track[] = [DIRECTING, CINEMATOGRAPHY];
export const TRACK_BY_ID: Record<string, Track> = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

/** @deprecated kept for older imports — the cinematography modules. */
export const COURSE: Module[] = CINEMATOGRAPHY.modules;

export const ALL_MODULES: Module[] = TRACKS.flatMap((t) => t.modules);
export const ALL_LESSONS: Lesson[] = ALL_MODULES.flatMap((m) => m.lessons);
export const trackLessons = (t: Track) => t.modules.flatMap((m) => m.lessons);

export const LESSON_BY_ID: Record<string, { lesson: Lesson; module: Module; track: Track; unit: number; index: number }> = {};
for (const track of TRACKS) {
  const lessons = trackLessons(track);
  track.modules.forEach((module, unit) => {
    for (const lesson of module.lessons) LESSON_BY_ID[lesson.id] = { lesson, module, track, unit, index: lessons.indexOf(lesson) };
  });
}

export const LESSONS_BY_SKILL: Record<string, Lesson[]> = {};
for (const l of ALL_LESSONS) for (const s of l.skills) (LESSONS_BY_SKILL[s] ??= []).push(l);

export type Locale = "en" | "hu";
export const pick = (s: L, locale: Locale) => s[locale];

/** The lesson after `id` within its track, or null at the end. */
export function nextLesson(id: string): Lesson | null {
  const e = LESSON_BY_ID[id];
  if (!e) return null;
  return trackLessons(e.track)[e.index + 1] ?? null;
}

export function lessonHref(id: string) {
  return `/lesson/${id}`;
}
