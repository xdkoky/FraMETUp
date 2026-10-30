"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { SelfAssessmentSchema } from "@/lib/validation/project";
import { recomputeMastery } from "@/lib/services/mastery";
import { awardXp } from "@/lib/services/xp";

export type AssessState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

export async function submitSelfAssessment(_: AssessState, formData: FormData): Promise<AssessState> {
  const user = await requireUser();
  const parsed = SelfAssessmentSchema.safeParse({
    skillId: formData.get("skillId"),
    level: formData.get("level"),
    reflection: formData.get("reflection") ?? undefined,
    exampleProjectId: formData.get("exampleProjectId") ?? undefined,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const rubric = await db.skillRubric.findFirst({ where: { skillId: d.skillId, isCurrent: true }, orderBy: { version: "desc" } });
  if (!rubric) return { error: "Unknown skill." };
  if (d.exampleProjectId) {
    const own = await db.project.findFirst({ where: { id: d.exampleProjectId, ownerId: user.id, deletedAt: null } });
    if (!own) return { error: "Example project not found." };
  }
  // Append-only: earlier assessments are kept as history.
  const created = await db.selfAssessment.create({
    data: { userId: user.id, skillId: d.skillId, rubricId: rubric.id, level: d.level, reflection: d.reflection, exampleProjectId: d.exampleProjectId },
  });
  // One XP award per skill per month, so re-rating repeatedly isn't rewarded.
  await awardXp(user.id, "SELF_ASSESSMENT", `${d.skillId}:${new Date().toISOString().slice(0, 7)}`);
  await recomputeMastery(user.id, [d.skillId]);
  const next = String(formData.get("next") ?? "");
  redirect(next === "queue" ? `/assess?done=${encodeURIComponent(d.skillId)}` : `/skills?skill=${encodeURIComponent(d.skillId)}&assessed=${created.id}`);
}
