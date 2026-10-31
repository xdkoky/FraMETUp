/** Planned vs actual shooting progress. Estimates only — never used to reschedule automatically. */

export interface ShotTiming {
  status: string;
  setupMinutes: number | null;
  prepStartedAt: Date | null;
  completedAt: Date | null;
}

export function scheduleProgress(shots: ShotTiming[], now = new Date()) {
  const counted = shots.filter((s) => s.status !== "SKIPPED");
  const done = counted.filter((s) => s.status === "COMPLETED");
  const remaining = counted.filter((s) => s.status !== "COMPLETED");
  const planned = (s: ShotTiming) => s.setupMinutes ?? 0;
  const actual = (s: ShotTiming) => (s.prepStartedAt && s.completedAt ? Math.max(0, (s.completedAt.getTime() - s.prepStartedAt.getTime()) / 60000) : null);
  const withActual = done.map((s) => ({ planned: planned(s), actual: actual(s) })).filter((x) => x.actual !== null && x.planned > 0) as { planned: number; actual: number }[];
  const plannedDone = withActual.reduce((a, x) => a + x.planned, 0);
  const actualDone = withActual.reduce((a, x) => a + x.actual, 0);
  const ratio = plannedDone > 0 ? actualDone / plannedDone : null;
  const remainingPlanned = remaining.reduce((a, s) => a + planned(s), 0);
  const inProgress = remaining.find((s) => s.prepStartedAt && !s.completedAt);
  const inProgressElapsed = inProgress?.prepStartedAt ? (now.getTime() - inProgress.prepStartedAt.getTime()) / 60000 : 0;
  return {
    total: counted.length,
    completed: done.length,
    skipped: shots.length - counted.length,
    remaining: remaining.length,
    plannedDoneMinutes: Math.round(plannedDone),
    actualDoneMinutes: Math.round(actualDone),
    /** Minutes over (+) or under (−) plan on completed setups that had both times. */
    deviationMinutes: ratio === null ? null : Math.round(actualDone - plannedDone),
    remainingPlannedMinutes: remainingPlanned,
    /** Remaining time if the crew keeps its current pace. A rough guide, not a promise. */
    projectedRemainingMinutes: ratio === null ? null : Math.round(remainingPlanned * ratio - Math.min(inProgressElapsed, planned(inProgress ?? { setupMinutes: 0 } as ShotTiming) * ratio)),
    sampleSize: withActual.length,
  };
}
