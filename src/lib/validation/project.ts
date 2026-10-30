import { z } from "zod";

export const PROJECT_TYPES = [
  "SHORT_FILM",
  "DIALOGUE_SCENE",
  "SILENT_EXERCISE",
  "DOCUMENTARY",
  "MUSIC_VIDEO",
  "COMMERCIAL",
  "EXPERIMENTAL",
  "FILM_ANALYSIS",
  "DIRECTING_WORKSHOP",
  "INDEPENDENT_PRACTICE",
] as const;
export const PROJECT_STATUSES = ["PLANNING", "IN_PRODUCTION", "POST_PRODUCTION", "COMPLETED", "ABANDONED"] as const;
export const VISIBILITIES = ["PRIVATE", "COLLABORATORS", "COHORT"] as const;

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date");

export const ProjectSchema = z
  .object({
    title: z.string().trim().min(2, "Give your project a title.").max(140),
    type: z.enum(PROJECT_TYPES),
    logline: z.string().trim().max(300).optional().transform((v) => v || null),
    description: z.string().trim().min(10, "Describe the project in a sentence or two.").max(5000),
    startDate: optionalDate,
    endDate: optionalDate,
    course: z.string().trim().max(140).optional().transform((v) => v || null),
    semester: z.coerce.number().int().min(1).max(12).optional().or(z.literal("").transform(() => undefined)),
    studentRole: z.string().trim().min(2).max(80).default("Director"),
    objectives: z
      .string()
      .optional()
      .transform((v) => (v ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10)),
    challenges: z.string().trim().max(5000).optional().transform((v) => v || null),
    status: z.enum(PROJECT_STATUSES).default("PLANNING"),
    visibility: z.enum(VISIBILITIES).default("PRIVATE"),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, { message: "End date must be after the start date.", path: ["endDate"] });

export const LinkSkillSchema = z
  .object({
    skillId: z.string().min(3).max(100),
    relevance: z.enum(["PRIMARY", "SECONDARY", "INCIDENTAL"]),
    difficulty: z.coerce.number().int().min(1).max(3),
    independence: z.enum(["WITH_GUIDANCE", "WITH_SUPPORT", "INDEPENDENT"]),
    demonstratedLevel: z.union([z.coerce.number().int().min(1).max(5), z.literal("").transform(() => null)]).nullable().default(null),
    justification: z.string().trim().max(2000).optional().transform((v) => v || null),
  })
  .refine((d) => d.demonstratedLevel === null || d.demonstratedLevel < 3 || (d.justification?.length ?? 0) >= 20, {
    message: "For level 3 and above, describe what you actually did (at least a sentence).",
    path: ["justification"],
  });

export const EvidenceSchema = z
  .object({
    kind: z.enum(["SCRIPT", "STORYBOARD", "SHOT_LIST", "DIRECTORS_NOTES", "VIDEO_LINK", "DOCUMENT_LINK", "NOTE"]),
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional().transform((v) => v || null),
    url: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || /^https:\/\/[^\s]+$/i.test(v), "Links must start with https://"),
    rightsConfirmed: z.literal("on").optional().transform((v) => v === "on"),
  })
  .refine((d) => !["VIDEO_LINK", "DOCUMENT_LINK"].includes(d.kind) || d.url, { message: "Add the link.", path: ["url"] });

export const SelfAssessmentSchema = z
  .object({
    skillId: z.string().min(3).max(100),
    level: z.coerce.number().int().min(1).max(5),
    reflection: z.string().trim().max(3000).optional().transform((v) => v || null),
    exampleProjectId: z.string().optional().transform((v) => v || null),
  })
  .refine((d) => d.level < 4 || (d.reflection?.length ?? 0) >= 40 || d.exampleProjectId, {
    message: "For level 4 or 5, add an example project or a short reflection (40+ characters) describing what you did.",
    path: ["reflection"],
  });
