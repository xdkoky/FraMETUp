import "server-only";
import { db } from "@/lib/db";
import { computeStreak, xpToday } from "@/lib/learn/progress";

export async function getLearnProgress(userId: string, now = new Date()) {
  const since = new Date(now.getTime() - 400 * 86400000);
  const [lessons, recent] = await Promise.all([
    db.experienceEvent.findMany({ where: { userId, kind: "LESSON_COMPLETED" }, select: { sourceId: true } }),
    db.experienceEvent.findMany({ where: { userId, createdAt: { gte: since } }, select: { awardedXp: true, createdAt: true } }),
  ]);
  const streak = computeStreak(recent.map((e) => e.createdAt), now);
  return { done: new Set(lessons.map((l) => l.sourceId)), streak: streak.days, activeToday: streak.activeToday, todayXp: xpToday(recent, now) };
}
