/** Crew roles, departments and how they map to permissions, skills and reflection prompts. */

export const DEPARTMENTS = ["direction", "camera", "lighting", "sound", "art", "production", "cast"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABEL: Record<Department, string> = {
  direction: "Direction",
  camera: "Camera",
  lighting: "Lighting & grip",
  sound: "Sound",
  art: "Art & props",
  production: "Production",
  cast: "Actors",
};

/** Departments that report readiness on the Live Set. */
export const READINESS_DEPARTMENTS: Department[] = ["camera", "lighting", "sound", "art", "cast"];

export interface CrewRole {
  key: string;
  label: string;
  department: Department;
  /** Leads can mark their department ready. */
  lead?: boolean;
}

export const CREW_ROLES: CrewRole[] = [
  { key: "director", label: "Director", department: "direction", lead: true },
  { key: "first_ad", label: "First Assistant Director", department: "direction", lead: true },
  { key: "second_ad", label: "Second Assistant Director", department: "direction" },
  { key: "script_supervisor", label: "Script Supervisor", department: "direction" },
  { key: "dop", label: "Director of Photography", department: "camera", lead: true },
  { key: "camera_operator", label: "Camera Operator", department: "camera" },
  { key: "first_ac", label: "First Assistant Camera", department: "camera", lead: true },
  { key: "second_ac", label: "Second Assistant Camera", department: "camera" },
  { key: "camera_assistant", label: "Camera Assistant", department: "camera" },
  { key: "gaffer", label: "Gaffer", department: "lighting", lead: true },
  { key: "best_boy", label: "Best Boy Electric", department: "lighting" },
  { key: "lighting_tech", label: "Lighting Technician", department: "lighting" },
  { key: "key_grip", label: "Key Grip", department: "lighting", lead: true },
  { key: "grip", label: "Grip", department: "lighting" },
  { key: "sound_mixer", label: "Production Sound Mixer", department: "sound", lead: true },
  { key: "boom_operator", label: "Boom Operator", department: "sound" },
  { key: "sound_assistant", label: "Sound Assistant", department: "sound" },
  { key: "production_designer", label: "Production Designer", department: "art", lead: true },
  { key: "art_director", label: "Art Director", department: "art", lead: true },
  { key: "props", label: "Props", department: "art" },
  { key: "set_dresser", label: "Set Dresser", department: "art" },
  { key: "producer", label: "Producer", department: "production", lead: true },
  { key: "production_manager", label: "Production Manager", department: "production", lead: true },
  { key: "production_assistant", label: "Production Assistant", department: "production" },
  { key: "actor", label: "Actor", department: "cast" },
];

export const ROLE_BY_KEY: Record<string, CrewRole> = Object.fromEntries(CREW_ROLES.map((r) => [r.key, r]));

/** Custom roles are free text; they belong to production unless a known role matches. */
export function roleInfo(key: string): CrewRole {
  return ROLE_BY_KEY[key] ?? { key, label: key, department: "production" };
}

export const roleLabel = (key: string) => roleInfo(key).label;

/** Roles that may edit scenes, briefs and shot lists. */
export const CREATIVE_ROLES = new Set(["director", "dop", "first_ad", "camera_operator", "first_ac", "script_supervisor", "producer"]);
/** Roles that may move shots through the live statuses. */
export const LIVE_ROLES = new Set(["director", "dop", "first_ad", "second_ad", "script_supervisor", "first_ac", "camera_operator", "producer", "production_manager"]);
/** Roles that may log takes. */
export const TAKE_ROLES = new Set(["script_supervisor", "director", "first_ad", "second_ad", "first_ac", "second_ac"]);
/** Roles that run the production (in addition to the creator). */
export const MANAGER_ROLES = new Set(["director", "producer", "production_manager", "first_ad"]);

/** Skills each role practises. Evidence only — the student maps rubric levels themselves. */
export const ROLE_SKILLS: Record<string, string[]> = {
  director: ["visual.blocking", "actor.communication", "leadership.creative-communication", "leadership.set-leadership", "leadership.decision-making", "visual.camera-placement"],
  first_ad: ["leadership.time-management", "leadership.crew-coordination", "professional.production-planning", "leadership.crisis"],
  second_ad: ["leadership.crew-coordination", "professional.communication"],
  script_supervisor: ["technical.continuity", "analysis.scene-analysis", "technical.production-workflow"],
  dop: ["visual.composition", "technical.lighting-fundamentals", "technical.lens-characteristics", "technical.exposure", "technical.technical-communication"],
  camera_operator: ["visual.framing", "visual.movement-motivation", "technical.camera-fundamentals"],
  first_ac: ["technical.camera-fundamentals", "technical.lens-characteristics", "technical.troubleshooting"],
  second_ac: ["technical.production-workflow", "technical.continuity"],
  camera_assistant: ["technical.camera-fundamentals", "technical.production-workflow"],
  gaffer: ["technical.lighting-fundamentals", "technical.lighting-motivation", "leadership.crew-coordination"],
  best_boy: ["technical.lighting-fundamentals", "technical.production-workflow"],
  lighting_tech: ["technical.lighting-fundamentals"],
  key_grip: ["technical.coverage-planning", "leadership.crew-coordination"],
  grip: ["technical.troubleshooting"],
  sound_mixer: ["technical.sound-awareness", "technical.troubleshooting"],
  boom_operator: ["technical.sound-awareness"],
  sound_assistant: ["technical.sound-awareness"],
  production_designer: ["visual.mise-en-scene", "visual.color-mood", "vision.visual-concept"],
  art_director: ["visual.mise-en-scene", "vision.visual-concept"],
  props: ["visual.mise-en-scene", "technical.continuity"],
  set_dresser: ["visual.mise-en-scene"],
  producer: ["professional.production-planning", "leadership.decision-making", "leadership.conflict-resolution"],
  production_manager: ["professional.production-planning", "leadership.time-management"],
  production_assistant: ["professional.collaboration", "professional.communication"],
};

/** Short reflection prompts adapted to the role a student held. */
export function reflectionQuestions(roles: string[]): string[] {
  const has = (k: string) => roles.includes(k);
  if (has("director"))
    return [
      "How effectively did you communicate your vision?",
      "What was your most difficult creative decision?",
      "How did you collaborate with the cinematographer?",
      "What would you approach differently next time?",
    ];
  if (has("dop") || has("camera_operator"))
    return [
      "How successfully did you translate the director's vision into images?",
      "What technical challenges did you encounter?",
      "How effectively did you communicate with the camera and lighting teams?",
      "What would you improve?",
    ];
  if (roles.some((r) => roleInfo(r).department === "sound"))
    return ["What sound problems came up, and how did you handle them?", "How well did you coordinate with camera and the AD?", "What would you improve?"];
  if (roles.some((r) => ["first_ad", "second_ad", "producer", "production_manager"].includes(r)))
    return ["How well did the day keep to schedule, and why?", "What problem did you solve that nobody else saw?", "What would you plan differently?"];
  return ["What did you contribute to this shoot?", "What did you learn from watching other departments?", "What would you like to try next time?"];
}
