import { z } from "zod";

export interface CatalogSkill {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface ReflectionAnalysisInput {
  reflectionText: string;
  projectTitle?: string;
  projectType?: string;
  linkedSkillIds: string[];
  catalog: CatalogSkill[];
}

export const SuggestionSchema = z.object({
  skillId: z.string(),
  rationale: z.string().max(600),
  evidenceQuote: z.string().max(400).nullable(),
  suggestedLevel: z.number().int().min(1).max(5).nullable(),
  confidence: z.number().min(0).max(1),
});

export const ReflectionAnalysisSchema = z.object({
  summary: z.string().max(1200),
  suggestions: z.array(SuggestionSchema).max(8),
  missingEvidence: z.array(z.string().max(300)).max(6),
  questions: z.array(z.string().max(300)).max(6),
  exercises: z.array(z.string().max(300)).max(4),
});

export type ReflectionAnalysis = z.infer<typeof ReflectionAnalysisSchema>;

export interface AIProvider {
  readonly id: "anthropic" | "local-heuristic";
  readonly model: string | null;
  /** true when the provider sends data to a third party */
  readonly external: boolean;
  analyzeReflection(input: ReflectionAnalysisInput): Promise<ReflectionAnalysis>;
}

/** JSON Schema mirror of ReflectionAnalysisSchema for structured outputs. */
export const REFLECTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "suggestions", "missingEvidence", "questions", "exercises"],
  properties: {
    summary: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["skillId", "rationale", "evidenceQuote", "suggestedLevel", "confidence"],
        properties: {
          skillId: { type: "string" },
          rationale: { type: "string" },
          evidenceQuote: { type: ["string", "null"] },
          suggestedLevel: { type: ["integer", "null"] },
          confidence: { type: "number" },
        },
      },
    },
    missingEvidence: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
    exercises: { type: "array", items: { type: "string" } },
  },
} as const;

/** Drops suggestions for unknown skills and clamps values; never trusts provider output blindly. */
export function sanitizeAnalysis(raw: unknown, validSkillIds: Set<string>): ReflectionAnalysis {
  const parsed = ReflectionAnalysisSchema.parse(raw);
  const seen = new Set<string>();
  return {
    ...parsed,
    suggestions: parsed.suggestions.filter((s) => {
      if (!validSkillIds.has(s.skillId) || seen.has(s.skillId)) return false;
      seen.add(s.skillId);
      return true;
    }),
  };
}
