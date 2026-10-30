import "server-only";
import type { Challenge } from "@prisma/client";
import { getLocale } from "@/i18n/server";
import { CHALLENGES_HU } from "@/lib/taxonomy/hu";

/** Overlays the Hungarian text on a curated challenge when the request is in Hungarian. */
export async function localizeChallenges<T extends Challenge>(list: T[]): Promise<T[]> {
  if ((await getLocale()) !== "hu") return list;
  return list.map((c) => {
    const hu = c.source === "CURATED" ? CHALLENGES_HU[c.id] : undefined;
    return hu ? { ...c, ...hu } : c;
  });
}
