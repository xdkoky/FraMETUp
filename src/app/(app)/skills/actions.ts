"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { awardXp } from "@/lib/services/xp";
import { drillSourceId } from "@/lib/services/practice";
import { SUBSKILL_BY_ID } from "@/lib/taxonomy/subskills";

/** Logs a drill session. Practice earns XP only — it never changes the mastery estimate. */
export async function logDrill(subId: string) {
  const user = await requireUser();
  const entry = SUBSKILL_BY_ID[subId];
  if (!entry) return { ok: false as const };
  const event = await awardXp(user.id, "DRILL_PRACTISED", drillSourceId(subId));
  revalidatePath("/skills");
  revalidatePath(`/skills/${entry.skillId}`);
  return { ok: true as const, xp: event.awardedXp };
}
