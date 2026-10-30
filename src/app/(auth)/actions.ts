"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/services/audit";

export type AuthState = { error?: string; fieldErrors?: Record<string, string[]> } | null;

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(200)
    .refine((p) => /[A-Za-z]/.test(p) && /[0-9\W]/.test(p), "Mix letters with numbers or symbols."),
  displayName: z.string().trim().min(2, "Tell us what to call you.").max(60),
  privacy: z.literal("on", { errorMap: () => ({ message: "Please confirm you have read the privacy notice." }) }),
});

export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const limit = rateLimit(`register:${await clientKey()}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Too many sign-up attempts. Please try again later." };

  const parsed = RegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { email, password, displayName } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { fieldErrors: { email: ["An account with this email already exists."] } };

  const studentRole = await db.role.findUnique({ where: { key: "STUDENT" } });
  if (!studentRole) return { error: "The database has not been seeded yet. Run `npm run db:seed`." };

  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      profile: { create: { displayName, interests: [] } },
      privacy: { create: {} },
      roles: { create: { roleId: studentRole.id } },
    },
  });
  await audit(user.id, "auth.register", "User", user.id);
  await createSession(user.id);
  redirect("/onboarding");
}

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { email, password } = parsed.data;

  const ipLimit = rateLimit(`login-ip:${await clientKey()}`, 30, 15 * 60 * 1000);
  const emailLimit = rateLimit(`login-email:${email}`, 8, 15 * 60 * 1000);
  if (!ipLimit.ok || !emailLimit.ok) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const user = await db.user.findUnique({ where: { email }, include: { profile: true } });
  // Always run bcrypt to keep timing similar for unknown emails.
  const ok = await verifyPassword(password, user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !ok || user.deletedAt) {
    if (user) await audit(user.id, "auth.login_failed", "User", user.id);
    return { error: "That email and password don't match." };
  }
  await createSession(user.id);
  await audit(user.id, "auth.login", "User", user.id);
  const next = String(formData.get("next") ?? "");
  if (!user.profile?.onboardedAt) redirect("/onboarding");
  if (!user.profile.quizCompletedAt && !user.profile.quizSkippedAt) redirect("/quiz");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user.id, "auth.logout", "User", user.id);
  redirect("/login");
}
