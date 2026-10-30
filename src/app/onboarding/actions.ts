"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/services/audit";

const Schema = z.object({
  displayName: z.string().trim().min(2).max(60),
  academicYear: z.coerce.number().int().min(1).max(6),
  enrollmentYear: z.coerce.number().int().min(2015).max(2035),
  interests: z.array(z.string()).max(8),
  experience: z.string().trim().max(2000).optional(),
  goalTitle: z.string().trim().max(140).optional(),
  goalSkills: z.array(z.string()).max(5),
  next: z.enum(["dashboard", "assess", "skills"]),
});

export type OnboardingState = { error?: string } | null;

export async function completeOnboarding(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireUser({ allowUnonboarded: true });
  const parsed = Schema.safeParse({
    displayName: formData.get("displayName"),
    academicYear: formData.get("academicYear"),
    enrollmentYear: formData.get("enrollmentYear"),
    interests: formData.getAll("interests"),
    experience: formData.get("experience") || undefined,
    goalTitle: formData.get("goalTitle") || undefined,
    goalSkills: formData.getAll("goalSkills"),
    next: formData.get("next") ?? "dashboard",
  });
  if (!parsed.success) return { error: "Please check the highlighted fields and try again." };
  const d = parsed.data;

  const validCats = new Set((await db.skillCategory.findMany({ select: { id: true } })).map((c) => c.id));
  const validSkills = new Set(
    (await db.skill.findMany({ where: { id: { in: d.goalSkills } }, select: { id: true } })).map((s) => s.id),
  );

  await db.$transaction(async (tx) => {
    await tx.userProfile.update({
      where: { userId: user.id },
      data: {
        displayName: d.displayName,
        academicYear: d.academicYear,
        enrollmentYear: d.enrollmentYear,
        interests: d.interests.filter((i) => validCats.has(i)),
        experience: d.experience,
        onboardedAt: new Date(),
      },
    });
    if (d.goalTitle) {
      await tx.learningGoal.create({
        data: {
          userId: user.id,
          title: d.goalTitle,
          skills: { create: [...validSkills].map((skillId) => ({ skillId })) },
        },
      });
    }
  });
  await audit(user.id, "onboarding.complete", "User", user.id);
  redirect(d.next === "assess" ? "/assess" : d.next === "skills" ? "/skills?welcome=1" : "/dashboard?welcome=1");
}
