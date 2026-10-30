import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { aggregateCategory } from "@/lib/assessment/engine";
import { practiceTier } from "@/lib/xp/xp";
import { computeAll } from "./mastery";
import { getTaxonomy } from "./taxonomy";

/** Live development picture for one user — always computed from stored evidence. */
export const getDevelopment = cache(async (userId: string) => {
  const [taxonomy, mastery, xpAgg] = await Promise.all([
    getTaxonomy(),
    computeAll(userId),
    db.experienceEvent.aggregate({ where: { userId }, _sum: { awardedXp: true } }),
  ]);
  const categories = taxonomy.categories.map((c) => ({
    ...c,
    ...aggregateCategory(
      c.id,
      taxonomy.skills.filter((s) => s.categoryId === c.id).map((s) => mastery[s.id] ?? { mastery: null, confidence: 0 }),
    ),
  }));
  const totalXp = xpAgg._sum.awardedXp ?? 0;
  const assessedCount = Object.values(mastery).filter((m) => m.mastery !== null).length;
  return { taxonomy, mastery, categories, totalXp, tier: practiceTier(totalXp), assessedCount };
});
