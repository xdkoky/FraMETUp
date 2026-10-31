export const STAGES = ["PRE_PRODUCTION", "READY", "PRODUCTION", "WRAPPED", "POST_PRODUCTION", "COMPLETED"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  PRE_PRODUCTION: "Pre-production",
  READY: "Ready to shoot",
  PRODUCTION: "Shooting",
  WRAPPED: "Wrapped",
  POST_PRODUCTION: "Post-production",
  COMPLETED: "Completed",
};

export interface PrepFacts {
  hasDirector: boolean;
  hasDop: boolean;
  crewCount: number;
  sceneCount: number;
  shotCount: number;
  shotsWithFocal: number;
  briefsFilled: number;
  callSheetPublished: boolean;
  openTasks: number;
  hasShootDate: boolean;
}

export interface PrepItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

/** What still needs doing before the shoot — the pre-production dashboard's checklist. */
export function prepChecklist(f: PrepFacts, base: string): PrepItem[] {
  return [
    { key: "date", label: "Set the shooting date", done: f.hasShootDate, href: `${base}/settings` },
    { key: "director", label: "Assign a director", done: f.hasDirector, href: `${base}/crew` },
    { key: "dop", label: "Assign a cinematographer", done: f.hasDop, href: `${base}/crew` },
    { key: "crew", label: "Invite at least 3 crew members", done: f.crewCount >= 3, href: `${base}/crew` },
    { key: "scenes", label: "Add scenes", done: f.sceneCount > 0, href: `${base}/scenes` },
    { key: "briefs", label: "Write a brief for every scene", done: f.sceneCount > 0 && f.briefsFilled >= f.sceneCount, href: `${base}/scenes` },
    { key: "shots", label: "Plan shots with lenses", done: f.shotCount > 0 && f.shotsWithFocal >= f.shotCount, href: `${base}/scenes` },
    { key: "callsheet", label: "Publish the call sheet", done: f.callSheetPublished, href: `${base}/callsheet` },
    { key: "tasks", label: "Finish open prep tasks", done: f.openTasks === 0, href: `${base}/tasks` },
  ];
}

export const prepProgress = (items: PrepItem[]) => (items.length ? items.filter((i) => i.done).length / items.length : 0);

export const PRODUCTION_TYPES = ["Studio exercise", "Short film", "Dialogue scene", "Music video", "Documentary", "Commercial", "Exam film"];
export const DOCUMENT_KINDS = ["Screenplay", "Shooting schedule", "Shot list", "Storyboards", "Floor plan", "Lighting diagram", "Equipment list", "Production notes", "Location information", "Continuity references"];
export const SHOT_SIZES = ["Extreme wide", "Wide", "Full", "Medium", "Medium close-up", "Close-up", "Extreme close-up", "Insert"];
export const SHOT_ANGLES = ["Eye level", "Low", "High", "Overhead", "Dutch", "POV", "Over the shoulder"];
export const SHOT_MOVES = ["Static", "Pan", "Tilt", "Dolly in", "Dolly out", "Tracking", "Handheld", "Gimbal", "Crane", "Zoom"];
