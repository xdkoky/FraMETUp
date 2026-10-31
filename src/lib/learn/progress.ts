/** Daily XP goal shown on the learning path. */
export const DAILY_GOAL = 50;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Consecutive UTC days with any logged activity, counting back from today.
 * A streak survives until the end of the day after the last activity.
 */
export function computeStreak(activity: Date[], now = new Date()): { days: number; activeToday: boolean } {
  const days = new Set(activity.map(dayKey));
  const today = dayKey(now);
  const activeToday = days.has(today);
  const cursor = new Date(`${today}T00:00:00Z`);
  if (!activeToday) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { days: n, activeToday };
}

export function xpToday(events: { awardedXp: number; createdAt: Date }[], now = new Date()) {
  const today = dayKey(now);
  return events.filter((e) => dayKey(e.createdAt) === today).reduce((s, e) => s + e.awardedXp, 0);
}
