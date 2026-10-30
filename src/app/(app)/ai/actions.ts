"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getLocale, getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { AI_DAILY_LIMIT, AI_MAX_INPUT_CHARS, externalAIConfigured, getProvider, type ReflectionAnalysis } from "@/lib/ai";
import { LocalHeuristicProvider } from "@/lib/ai/local";
import { getTaxonomy } from "@/lib/services/taxonomy";
import { audit } from "@/lib/services/audit";
import { recomputeMastery } from "@/lib/services/mastery";

export type AnalysisResult =
  | { error: string }
  | {
      ok: true;
      provider: string;
      note?: string;
      analysis: ReflectionAnalysis;
      assessmentId: string;
      suggestions: { id: string; skillId: string; rationale: string; evidenceQuote: string | null; suggestedLevel: number | null; confidence: number }[];
    };

export async function analyzeReflection(reflectionId: string): Promise<AnalysisResult> {
  const user = await requireUser();
  const reflection = await db.reflection.findFirst({
    where: { id: reflectionId, userId: user.id, deletedAt: null },
    include: { project: { include: { skillLinks: { select: { skillId: true } } } } },
  });
  if (!reflection) return { error: (await getT())("Reflection not found.") };

  const since = new Date(Date.now() - 86400000);
  const used = await db.aIAssessment.count({ where: { userId: user.id, createdAt: { gte: since } } });
  if (used >= AI_DAILY_LIMIT) return { error: (await getT())("Daily analysis limit reached ({n}). Try again tomorrow.", { n: AI_DAILY_LIMIT }) };
  if (reflection.body.length > AI_MAX_INPUT_CHARS) {
    return { error: (await getT())("This reflection is {n} characters; analysis is limited to {max}. Split it into shorter reflections.", { n: reflection.body.length, max: AI_MAX_INPUT_CHARS }) };
  }

  const privacy = await db.privacySettings.findUnique({ where: { userId: user.id } });
  const consent = Boolean(privacy?.aiConsent);
  let provider = getProvider({ consent });
  let note: string | undefined =
    externalAIConfigured() && !consent
      ? "Used the local heuristic because AI analysis isn't enabled in your privacy settings. Nothing left this server."
      : !externalAIConfigured()
        ? "No AI provider is configured, so the local keyword heuristic was used. Nothing left this server."
        : undefined; // translated in the client

  const taxonomy = await getTaxonomy();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const input = {
    language: locale,
    t,
    reflectionText: reflection.body,
    projectTitle: reflection.project?.title,
    projectType: reflection.project?.type,
    linkedSkillIds: reflection.project?.skillLinks.map((l) => l.skillId) ?? [],
    catalog: taxonomy.skills
      .filter((s) => !s.archived)
      .map((s) => ({ id: s.id, name: s.name, category: taxonomy.categoryById[s.categoryId].name, description: s.description })),
  };

  let analysis: ReflectionAnalysis;
  try {
    analysis = await provider.analyzeReflection(input);
  } catch (e) {
    console.error("AI provider failed", e);
    provider = new LocalHeuristicProvider();
    analysis = await provider.analyzeReflection(input);
    note = "The AI service was unavailable, so the local keyword heuristic was used instead.";
  }

  const record = await db.aIAssessment.create({
    data: {
      userId: user.id,
      kind: "REFLECTION_ANALYSIS",
      provider: provider.id,
      model: provider.model,
      inputType: "reflection",
      inputId: reflection.id,
      inputChars: reflection.body.length,
      output: analysis as unknown as Prisma.InputJsonValue,
      suggestions: {
        create: analysis.suggestions.map((s) => ({
          skillId: s.skillId,
          rationale: s.rationale,
          evidenceQuote: s.evidenceQuote,
          suggestedLevel: s.suggestedLevel,
          confidence: s.confidence,
        })),
      },
    },
    include: { suggestions: true },
  });
  await db.reflection.update({ where: { id: reflection.id }, data: { updatedAt: new Date() } });
  await audit(user.id, "ai.analyze_reflection", "Reflection", reflection.id, { provider: provider.id, external: provider.external, chars: reflection.body.length });
  if (reflection.projectId) revalidatePath(`/projects/${reflection.projectId}`);
  return {
    ok: true,
    provider: provider.id,
    note,
    analysis,
    assessmentId: record.id,
    suggestions: record.suggestions.map(({ id, skillId, rationale, evidenceQuote, suggestedLevel, confidence }) => ({ id, skillId, rationale, evidenceQuote, suggestedLevel, confidence })),
  };
}

export async function decideSuggestion(suggestionId: string, decision: "ACCEPTED" | "DISMISSED") {
  const user = await requireUser();
  const s = await db.aISkillSuggestion.findFirst({
    where: { id: suggestionId, aiAssessment: { userId: user.id } },
    include: { aiAssessment: true },
  });
  if (!s) return { error: "Suggestion not found." };
  await db.aISkillSuggestion.update({ where: { id: s.id }, data: { status: decision, decidedAt: new Date() } });

  // Accepting a suggested tag links the skill to the reflection's project as practice.
  if (decision === "ACCEPTED" && s.aiAssessment.inputType === "reflection") {
    const reflection = await db.reflection.findUnique({ where: { id: s.aiAssessment.inputId } });
    if (reflection?.projectId) {
      await db.skillEvidenceLink.upsert({
        where: { projectId_skillId: { projectId: reflection.projectId, skillId: s.skillId } },
        create: { projectId: reflection.projectId, skillId: s.skillId, relevance: "SECONDARY", justification: s.evidenceQuote ? `From reflection: “${s.evidenceQuote.slice(0, 300)}”` : null },
        update: {},
      });
      revalidatePath(`/projects/${reflection.projectId}`);
    }
  }
  await audit(user.id, `ai.suggestion_${decision.toLowerCase()}`, "AISkillSuggestion", s.id);
  await recomputeMastery(user.id, [s.skillId]);
  return { ok: true };
}
