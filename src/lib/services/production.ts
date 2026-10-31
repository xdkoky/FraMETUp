import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { productionAccess, type ProductionAccess } from "@/lib/production/permissions";
import { countExperience } from "@/lib/production/rotation";
import { notify } from "./notifications";

const memberSelect = { id: true, userId: true, roles: true, isManager: true, isActor: true, status: true } as const;

export async function loadAccess(user: CurrentUser, productionId: string) {
  const production = await db.production.findUnique({ where: { id: productionId }, include: { members: { select: memberSelect } } });
  if (!production) return null;
  const access = productionAccess({ id: user.id, roles: user.roles }, production);
  return { production, access };
}

/** Throws notFound() (never 403) when the user may not do `need` on this production. */
export async function requireProduction(user: CurrentUser, productionId: string, need: keyof Pick<ProductionAccess, "view" | "manage" | "editCreative" | "liveUpdate" | "logTakes"> = "view") {
  const r = await loadAccess(user, productionId);
  if (!r || !r.access[need]) notFound();
  if (need !== "view" && r.access.staffView && !user.roles.includes("ADMIN")) notFound(); // instructors observe, they don't edit
  return r;
}

/** Records a change; important ones notify every accepted crew member (except the actor). */
export async function logChange(productionId: string, actorId: string | null, kind: string, summary: string, opts: { important?: boolean; href?: string; notifyKind?: string } = {}) {
  await db.productionChange.create({ data: { productionId, actorId, kind, summary, important: Boolean(opts.important) } });
  await db.production.update({ where: { id: productionId }, data: { updatedAt: new Date() } });
  if (opts.important) await notifyMembers(productionId, opts.notifyKind ?? "PRODUCTION_UPDATE", summary, opts.href ?? `/production/${productionId}`, actorId);
}

export async function notifyMembers(productionId: string, kind: string, title: string, href: string, exceptUserId: string | null, body?: string) {
  const p = await db.production.findUnique({ where: { id: productionId }, select: { title: true, members: { where: { status: "ACCEPTED", userId: { not: null } }, select: { userId: true } } } });
  if (!p) return;
  for (const m of p.members) if (m.userId && m.userId !== exceptUserId) await notify(m.userId, kind, title, body ?? p.title, href);
}

export async function myProductions(userId: string) {
  return db.production.findMany({
    where: { deletedAt: null, OR: [{ createdById: userId }, { members: { some: { userId, status: "ACCEPTED" } } }] },
    include: {
      members: { select: { id: true, userId: true, name: true, roles: true, status: true } },
      _count: { select: { scenes: true, shots: true, tasks: true } },
    },
    orderBy: [{ shootDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
  });
}

export async function myInvitations(userId: string) {
  return db.productionMember.findMany({ where: { userId, status: "INVITED", production: { deletedAt: null } }, include: { production: { select: { id: true, title: true, shootDate: true, location: true } } } });
}

/** Roles a student held on productions that have wrapped (practical experience). */
export async function roleExperience(userId: string) {
  const rows = await db.productionMember.findMany({
    where: { userId, status: "ACCEPTED", production: { deletedAt: null, status: { in: ["WRAPPED", "POST_PRODUCTION", "COMPLETED"] } } },
    select: { roles: true },
  });
  return { experience: countExperience(rows), productions: rows.length };
}

export async function myOpenTasks(userId: string) {
  return db.productionTask.findMany({
    where: { status: { not: "DONE" }, assignee: { userId, status: "ACCEPTED" }, production: { deletedAt: null } },
    include: { production: { select: { id: true, title: true, shootDate: true } } },
    orderBy: [{ due: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
    take: 20,
  });
}

export async function latestChangeAt(productionId: string) {
  const c = await db.productionChange.findFirst({ where: { productionId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  return c?.createdAt ?? null;
}
