import "server-only";
import { db } from "@/lib/db";
import type { DrillPractice } from "@/components/skill-tree/types";

/** One practice log per drill per (UTC) day; the date lives in the XP source id. */
export function drillSourceId(subId: string, now = new Date()) {
  return `${subId}@${now.toISOString().slice(0, 10)}`;
}

export async function getDrillPractice(userId: string, now = new Date()): Promise<DrillPractice> {
  const events = await db.experienceEvent.findMany({ where: { userId, kind: "DRILL_PRACTISED" }, select: { sourceId: true } });
  const today = now.toISOString().slice(0, 10);
  const out: DrillPractice = {};
  for (const e of events) {
    const at = e.sourceId.lastIndexOf("@");
    if (at < 0) continue;
    const entry = (out[e.sourceId.slice(0, at)] ??= { count: 0, today: false });
    entry.count += 1;
    if (e.sourceId.slice(at + 1) === today) entry.today = true;
  }
  return out;
}
