import "server-only";
import { effectiveRoles } from "./staff-emails";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { RoleKey } from "@prisma/client";
import { db } from "@/lib/db";
import { generateSessionToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "dos_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  const h = await headers();
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: h.get("user-agent")?.slice(0, 200) },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SECURE_COOKIES === "true" || Boolean(process.env.VERCEL),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export interface CurrentUser {
  id: string;
  email: string;
  isDemo: boolean;
  displayName: string;
  onboarded: boolean;
  /** Finished or postponed the starting-point quiz. */
  quizSeen: boolean;
  roles: RoleKey[];
  enrollmentYear: number | null;
}

/** Validates the session cookie against the database. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true, roles: { include: { role: true } } } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.deletedAt) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    isDemo: u.isDemo,
    displayName: u.profile?.displayName ?? u.email.split("@")[0],
    onboarded: Boolean(u.profile?.onboardedAt),
    quizSeen: Boolean(u.profile?.quizCompletedAt || u.profile?.quizSkippedAt),
    roles: effectiveRoles(u.email, u.roles.map((r) => r.role.key), { ADMIN_EMAILS: process.env.ADMIN_EMAILS }),
    enrollmentYear: u.profile?.enrollmentYear ?? null,
  };
});

export async function requireUser(opts: { allowUnonboarded?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!opts.allowUnonboarded && !user.onboarded) redirect("/onboarding");
  return user;
}

export async function requireRole(role: RoleKey) {
  const user = await requireUser();
  if (!user.roles.includes(role)) redirect("/dashboard");
  return user;
}
