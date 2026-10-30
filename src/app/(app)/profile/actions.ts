"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export type ProfileState = { error?: string; ok?: string } | null;

const ProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  academicYear: z.coerce.number().int().min(1).max(6),
  enrollmentYear: z.coerce.number().int().min(2015).max(2035),
  bio: z.string().trim().max(1000).optional(),
  experience: z.string().trim().max(2000).optional(),
  interests: z.array(z.string()).max(8),
});

export async function updateProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = ProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    academicYear: formData.get("academicYear"),
    enrollmentYear: formData.get("enrollmentYear"),
    bio: formData.get("bio") ?? undefined,
    experience: formData.get("experience") ?? undefined,
    interests: formData.getAll("interests"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const cats = new Set((await db.skillCategory.findMany({ select: { id: true } })).map((c) => c.id));
  await db.userProfile.update({
    where: { userId: user.id },
    data: { ...parsed.data, interests: parsed.data.interests.filter((i) => cats.has(i)) },
  });
  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}

export async function createGoal(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3 || title.length > 140) return { error: "Give the goal a short title." };
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000) || null;
  const skillIds = formData.getAll("skillIds").map(String).slice(0, 5);
  const valid = await db.skill.findMany({ where: { id: { in: skillIds } }, select: { id: true } });
  const targetSemester = Number(formData.get("targetSemester")) || null;
  await db.learningGoal.create({
    data: { userId: user.id, title, description, targetSemester, skills: { create: valid.map((s) => ({ skillId: s.id })) } },
  });
  revalidatePath("/profile");
  return { ok: "Goal added." };
}

export async function setGoalStatus(goalId: string, status: "ACTIVE" | "ACHIEVED" | "ARCHIVED") {
  const user = await requireUser();
  await db.learningGoal.updateMany({
    where: { id: goalId, userId: user.id },
    data: { status, achievedAt: status === "ACHIEVED" ? new Date() : null },
  });
  revalidatePath("/profile");
}

export async function markNotificationsRead() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/profile");
}
