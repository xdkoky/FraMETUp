import "server-only";
import { db } from "@/lib/db";
import { calculateXp, type XpKind } from "@/lib/xp/xp";

/** Awards XP once per (kind, source). Re-saving the same item never awards twice. */
export async function awardXp(userId: string, kind: XpKind, sourceId: string, quality = 1) {
  const existing = await db.experienceEvent.findUnique({
    where: { userId_kind_sourceId: { userId, kind, sourceId } },
  });
  if (existing) return existing;
  const since = new Date(Date.now() - 8 * 86400000);
  const prior = await db.experienceEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { kind: true, awardedXp: true, createdAt: true },
  });
  const award = calculateXp(kind, prior, new Date(), quality);
  return db.experienceEvent.upsert({
    where: { userId_kind_sourceId: { userId, kind, sourceId } },
    create: { userId, kind, sourceId, ...award },
    update: {},
  });
}
