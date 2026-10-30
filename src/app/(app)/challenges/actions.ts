"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { awardXp } from "@/lib/services/xp";
import { recomputeMastery } from "@/lib/services/mastery";

export async function acceptChallenge(challengeId: string, formData: FormData) {
  const user = await requireUser();
  if (!(await db.challenge.findUnique({ where: { id: challengeId } }))) return;
  const personalNotes = String(formData.get("personalNotes") ?? "").trim().slice(0, 2000) || null;
  await db.challengeCompletion.upsert({
    where: { userId_challengeId: { userId: user.id, challengeId } },
    create: { userId: user.id, challengeId, status: "ACCEPTED", personalNotes },
    update: { status: "ACCEPTED", personalNotes, completedAt: null },
  });
  revalidatePath("/challenges");
}

export async function completeChallenge(challengeId: string, formData: FormData) {
  const user = await requireUser();
  const challenge = await db.challenge.findUnique({ where: { id: challengeId }, include: { skills: true } });
  if (!challenge) return;
  const projectId = z.string().optional().parse(formData.get("projectId") || undefined);
  const project = projectId ? await db.project.findFirst({ where: { id: projectId, ownerId: user.id, deletedAt: null } }) : null;
  await db.challengeCompletion.upsert({
    where: { userId_challengeId: { userId: user.id, challengeId } },
    create: { userId: user.id, challengeId, status: "COMPLETED", completedAt: new Date(), projectId: project?.id },
    update: { status: "COMPLETED", completedAt: new Date(), projectId: project?.id },
  });
  await awardXp(user.id, "CHALLENGE_COMPLETED", challengeId);
  if (project) {
    // Link target skills as practice; the student maps rubric levels on the project page.
    for (const s of challenge.skills) {
      await db.skillEvidenceLink.upsert({
        where: { projectId_skillId: { projectId: project.id, skillId: s.skillId } },
        create: { projectId: project.id, skillId: s.skillId, relevance: "PRIMARY", difficulty: challenge.difficulty },
        update: {},
      });
    }
    await recomputeMastery(user.id, challenge.skills.map((s) => s.skillId));
  }
  revalidatePath("/challenges");
}

export async function dismissChallenge(challengeId: string) {
  const user = await requireUser();
  await db.challengeCompletion.upsert({
    where: { userId_challengeId: { userId: user.id, challengeId } },
    create: { userId: user.id, challengeId, status: "DISMISSED" },
    update: { status: "DISMISSED" },
  });
  revalidatePath("/challenges");
}

export async function restoreChallenge(challengeId: string) {
  const user = await requireUser();
  await db.challengeCompletion.deleteMany({ where: { userId: user.id, challengeId, status: "DISMISSED" } });
  revalidatePath("/challenges");
}
