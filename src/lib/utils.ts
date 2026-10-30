import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}

export function relativeTime(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime();
  const day = 86400000;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < day) return `${Math.floor(diff / 3600000)} h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} d ago`;
  return formatDate(d);
}

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  SHORT_FILM: "Short film",
  DIALOGUE_SCENE: "Dialogue scene",
  SILENT_EXERCISE: "Silent film exercise",
  DOCUMENTARY: "Documentary",
  MUSIC_VIDEO: "Music video",
  COMMERCIAL: "Commercial",
  EXPERIMENTAL: "Experimental film",
  FILM_ANALYSIS: "Film analysis assignment",
  DIRECTING_WORKSHOP: "Directing workshop",
  INDEPENDENT_PRACTICE: "Independent practice",
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  PLANNING: "Planning",
  IN_PRODUCTION: "In production",
  POST_PRODUCTION: "Post-production",
  COMPLETED: "Completed",
  ABANDONED: "Set aside",
};

export const OBSERVATION_LABEL: Record<string, string> = {
  NOT_OBSERVED: "Not observed",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
  OBSERVED_WITH_DIFFICULTY: "Observed with difficulty",
  DEMONSTRATED_WITH_SUPPORT: "Demonstrated with support",
  DEMONSTRATED_INDEPENDENTLY: "Demonstrated independently",
  DEMONSTRATED_CONSISTENTLY: "Consistently, in challenging situations",
};

export const VISIBILITY_LABEL: Record<string, string> = {
  PRIVATE: "Private — only me",
  COLLABORATORS: "Collaborators on this project",
  COHORT: "My cohort",
};
