"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { QUIZ, scoreQuiz, type Level } from "@/lib/quiz/questions";
import { QUIZ_NOTE } from "@/lib/quiz/constants";
import { recomputeMastery } from "@/lib/services/mastery";
import { awardXp } from "@/lib/services/xp";
import { audit } from "@/lib/services/audit";

const AnswersSchema = z.record(z.string().max(40), z.union([z.string().max(60), z.array(z.string().max(60)).max(12)]));

export type QuizOutcome = { error: string } | { ok: true; levels: Record<string, Level>; kept: string[] };

export async function submitQuiz(raw: unknown): Promise<QuizOutcome> {
  const user = await requireUser();
  const parsed = AnswersSchema.safeParse(raw);
  if (!parsed.success) return { error: "Something went wrong with your answers. Please try again." };
  const known = new Set(QUIZ.map((q) => q.id));
  const answers = Object.fromEntries(Object.entries(parsed.data).filter(([k]) => known.has(k)));
  const levels = scoreQuiz(answers);

  // Never override a level the student set by hand; earlier quiz results may be replaced.
  const latest = await db.selfAssessment.findMany({
    where: { userId: user.id, skillId: { in: Object.keys(levels) } },
    orderBy: { createdAt: "desc" },
    distinct: ["skillId"],
  });
  const manual = new Set(latest.filter((s) => s.reflection !== QUIZ_NOTE).map((s) => s.skillId));
  const rubrics = await db.skillRubric.findMany({ where: { skillId: { in: Object.keys(levels) }, isCurrent: true } });
  const rubricBySkill = new Map(rubrics.map((r) => [r.skillId, r.id]));

  const toWrite = Object.entries(levels).filter(([skillId]) => !manual.has(skillId) && rubricBySkill.has(skillId));
  await db.$transaction([
    ...toWrite.map(([skillId, level]) =>
      db.selfAssessment.create({ data: { userId: user.id, skillId, rubricId: rubricBySkill.get(skillId)!, level, reflection: QUIZ_NOTE } }),
    ),
    db.userProfile.update({
      where: { userId: user.id },
      data: { quizCompletedAt: new Date(), quizSkippedAt: null, quizResult: { answers, levels } as Prisma.InputJsonValue },
    }),
  ]);
  await awardXp(user.id, "SELF_ASSESSMENT", "starting-quiz");
  await recomputeMastery(user.id, toWrite.map(([s]) => s));
  await audit(user.id, "quiz.complete", "User", user.id, { skills: toWrite.length });
  return { ok: true, levels: Object.fromEntries(toWrite) as Record<string, Level>, kept: [...manual] };
}

export async function skipQuiz() {
  const user = await requireUser();
  await db.userProfile.update({ where: { userId: user.id }, data: { quizSkippedAt: new Date() } });
  redirect("/dashboard");
}
