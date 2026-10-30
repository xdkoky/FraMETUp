"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { destroySession, requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { audit } from "@/lib/services/audit";
import { deleteAccount } from "@/lib/services/account";

export type SettingsState = { error?: string; ok?: string } | null;

const PrivacySchema = z.object({
  profileVisibility: z.enum(["PRIVATE", "COHORT"]),
  defaultProjectVisibility: z.enum(["PRIVATE", "COLLABORATORS", "COHORT"]),
  allowReviewRequests: z.boolean(),
  aiConsent: z.boolean(),
  retentionDays: z.union([z.literal(""), z.coerce.number().int().min(30).max(3650)]).transform((v) => (v === "" ? null : v)),
});

export async function updatePrivacy(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const parsed = PrivacySchema.safeParse({
    profileVisibility: formData.get("profileVisibility"),
    defaultProjectVisibility: formData.get("defaultProjectVisibility"),
    allowReviewRequests: formData.get("allowReviewRequests") === "on",
    aiConsent: formData.get("aiConsent") === "on",
    retentionDays: formData.get("retentionDays") ?? "",
  });
  if (!parsed.success) return { error: "Please check your settings." };
  const before = await db.privacySettings.findUnique({ where: { userId: user.id } });
  const d = parsed.data;
  await db.privacySettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...d, aiConsentAt: d.aiConsent ? new Date() : null },
    update: { ...d, aiConsentAt: d.aiConsent ? (before?.aiConsent ? before.aiConsentAt : new Date()) : null },
  });
  if (before?.aiConsent !== d.aiConsent) await audit(user.id, d.aiConsent ? "privacy.ai_consent_granted" : "privacy.ai_consent_withdrawn", "User", user.id);
  revalidatePath("/settings");
  return { ok: "Privacy settings saved." };
}

export async function changePassword(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 10) return { error: "New password must be at least 10 characters." };
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, record.passwordHash))) return { error: "Current password is incorrect." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await audit(user.id, "auth.password_change", "User", user.id);
  return { ok: "Password updated." };
}

export async function deleteMyAccount(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  if (formData.get("confirm") !== "DELETE") return { error: "Type DELETE to confirm." };
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(String(formData.get("password") ?? ""), record.passwordHash))) return { error: "Password is incorrect." };
  await destroySession();
  await deleteAccount(user.id);
  redirect("/login?deleted=1");
}
