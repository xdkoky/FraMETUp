"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { awardXp } from "@/lib/services/xp";
import { getLearnProgress } from "@/lib/services/learn";
import { LESSON_BY_ID } from "@/lib/learn";

/** Finishes a lesson once its check is answered correctly. XP only — mastery still needs evidence. */
export async function completeLesson(lessonId: string, answer: number) {
  const user = await requireUser();
  const entry = LESSON_BY_ID[lessonId];
  if (!entry || entry.lesson.check.answer !== answer) return { ok: false as const };
  const started = Date.now();
  const event = await awardXp(user.id, "LESSON_COMPLETED", lessonId);
  // awardXp returns the original event when the lesson was finished before; that earns nothing new.
  const fresh = event.createdAt.getTime() >= started - 1000;
  const progress = await getLearnProgress(user.id);
  revalidatePath("/learn");
  revalidatePath("/skills");
  return { ok: true as const, xp: fresh ? event.awardedXp : 0, streak: progress.streak, todayXp: progress.todayXp };
}
