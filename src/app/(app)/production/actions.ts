"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ShotStatus, TaskPriority, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { audit } from "@/lib/services/audit";
import { awardXp } from "@/lib/services/xp";
import { notify } from "@/lib/services/notifications";
import { recomputeMastery } from "@/lib/services/mastery";
import { logChange, requireProduction } from "@/lib/services/production";
import { rateLimit } from "@/lib/rate-limit";
import { deleteUpload, storeUpload } from "@/lib/uploads";
import { reflectionQuality } from "@/lib/xp/xp";
import { CallSheetData, diffCallSheets } from "@/lib/production/callsheet";
import { READINESS_DEPARTMENTS, ROLE_SKILLS, roleLabel, type Department } from "@/lib/production/roles";
import { STAGES, STAGE_LABEL, type Stage } from "@/lib/production/lifecycle";

export type FormState = { error?: string; ok?: string } | null;

const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const num = (fd: FormData, k: string) => {
  const v = Number(String(fd.get(k) ?? "").replace(",", "."));
  return Number.isFinite(v) && String(fd.get(k) ?? "").trim() !== "" ? v : null;
};
const rolesFrom = (fd: FormData) => {
  const picked = fd.getAll("roles").map(String);
  const custom = str(fd, "customRole", 60);
  return [...new Set([...picked, ...(custom ? [custom] : [])].map((r) => r.trim()).filter(Boolean))].slice(0, 6);
};
const base = (id: string) => `/production/${id}`;
const refresh = (id: string, ...paths: string[]) => {
  revalidatePath(base(id), "layout");
  for (const p of paths) revalidatePath(p);
};

// ── Productions ──────────────────────────────────────────────────────────────

export async function createProduction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!rateLimit(`production-create:${user.id}`, 20, 3600_000).ok) return { error: "You're creating productions very quickly. Please wait a moment." };
  const title = str(fd, "title", 140);
  if (title.length < 2) return { error: "Give the production a title." };
  const date = str(fd, "shootDate", 30);
  const myRoles = rolesFrom(fd);
  const p = await db.production.create({
    data: {
      title,
      description: str(fd, "description", 3000),
      type: str(fd, "type", 60) || "Studio exercise",
      location: str(fd, "location", 160) || "Lloyd Studio",
      shootDate: date ? new Date(date) : null,
      createdById: user.id,
      members: { create: { userId: user.id, name: user.displayName, roles: myRoles, isManager: true, status: "ACCEPTED", respondedAt: new Date() } },
      readiness: { create: READINESS_DEPARTMENTS.map((department) => ({ department })) },
      callSheets: { create: { state: "DRAFT", data: CallSheetData.parse({ location: str(fd, "location", 160) || "Lloyd Studio", date: date.slice(0, 10) }) } },
    },
  });
  await logChange(p.id, user.id, "production.create", "Production created");
  await audit(user.id, "production.create", "Production", p.id);
  redirect(base(p.id));
}

export async function updateProduction(id: string, fd: FormData) {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  const date = str(fd, "shootDate", 30);
  const before = await db.production.findUniqueOrThrow({ where: { id }, select: { shootDate: true, location: true } });
  const shootDate = date ? new Date(date) : null;
  const location = str(fd, "location", 160) || "Lloyd Studio";
  await db.production.update({
    where: { id },
    data: { title: str(fd, "title", 140) || "Untitled production", description: str(fd, "description", 3000), type: str(fd, "type", 60) || "Studio exercise", location, shootDate },
  });
  const moved = (before.shootDate?.getTime() ?? 0) !== (shootDate?.getTime() ?? 0) || before.location !== location;
  await logChange(id, user.id, "production.update", moved ? "Shooting date or location changed" : "Production details updated", { important: moved, notifyKind: "SCHEDULE_CHANGED" });
  refresh(id);
}

export async function setProductionStatus(id: string, status: Stage) {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  if (!STAGES.includes(status)) return;
  await db.production.update({ where: { id }, data: { status } });
  if (status === "WRAPPED") {
    await db.wrapReport.upsert({ where: { productionId: id }, create: { productionId: id, wrappedById: user.id }, update: {} });
    const crew = await db.productionMember.findMany({ where: { productionId: id, status: "ACCEPTED", userId: { not: null } }, select: { userId: true } });
    // Participation XP — activity, never mastery.
    for (const m of crew) if (m.userId) await awardXp(m.userId, "PRODUCTION_WRAPPED", id);
    await logChange(id, user.id, "production.wrap", "That's a wrap! Write your short reflection.", { important: true, href: `${base(id)}/wrap`, notifyKind: "PRODUCTION_WRAPPED" });
  } else {
    await logChange(id, user.id, "production.status", `Production is now: ${STAGE_LABEL[status]}`, { important: status === "READY" || status === "PRODUCTION" });
  }
  refresh(id, "/production");
}

export async function deleteProduction(id: string) {
  const user = await requireUser();
  const { production } = await requireProduction(user, id, "manage");
  if (production.createdById !== user.id && !user.roles.includes("ADMIN")) return;
  await db.production.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(user.id, "production.delete", "Production", id);
  redirect("/production");
}

// ── Crew ─────────────────────────────────────────────────────────────────────

export async function inviteMember(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  const email = str(fd, "email", 200).toLowerCase();
  const roles = rolesFrom(fd);
  if (!roles.length) return { error: "Pick at least one role." };
  const target = await db.user.findUnique({ where: { email }, include: { profile: { select: { displayName: true } } } });
  if (!target || target.deletedAt) return { error: "No FraMETUp account uses this email. Add them as a guest instead, or ask them to sign up." };
  const existing = await db.productionMember.findUnique({ where: { productionId_userId: { productionId: id, userId: target.id } } });
  if (existing && existing.status !== "DECLINED") return { error: "This person is already on the production." };
  const data = { name: target.profile?.displayName ?? email, roles, isActor: roles.includes("actor"), isManager: fd.get("isManager") === "on", status: "INVITED" as const, invitedAt: new Date(), respondedAt: null };
  if (existing) await db.productionMember.update({ where: { id: existing.id }, data });
  else await db.productionMember.create({ data: { productionId: id, userId: target.id, ...data } });
  const p = await db.production.findUniqueOrThrow({ where: { id }, select: { title: true } });
  await notify(target.id, "PRODUCTION_INVITE", `You're invited to ${p.title}`, roles.map(roleLabel).join(", "), "/production");
  await logChange(id, user.id, "crew.invite", `${data.name} invited as ${roles.map(roleLabel).join(", ")}`);
  refresh(id);
  return { ok: "Invitation sent." };
}

export async function addGuest(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  const name = str(fd, "name", 100);
  const roles = rolesFrom(fd);
  if (name.length < 2) return { error: "Enter the person's name." };
  if (!roles.length) return { error: "Pick at least one role." };
  await db.productionMember.create({
    data: { productionId: id, name, roles, isActor: roles.includes("actor") || fd.get("isActor") === "on", phone: str(fd, "phone", 40) || null, email: str(fd, "email", 200) || null, status: "ACCEPTED", respondedAt: new Date() },
  });
  await logChange(id, user.id, "crew.guest", `${name} added as ${roles.map(roleLabel).join(", ")}`);
  refresh(id);
  return { ok: "Added." };
}

export async function respondInvitation(memberId: string, accept: boolean) {
  const user = await requireUser();
  const m = await db.productionMember.findUnique({ where: { id: memberId } });
  if (!m || m.userId !== user.id || m.status !== "INVITED") return;
  await db.productionMember.update({ where: { id: memberId }, data: { status: accept ? "ACCEPTED" : "DECLINED", respondedAt: new Date() } });
  await logChange(m.productionId, user.id, "crew.respond", `${m.name} ${accept ? "joined" : "declined"}`);
  revalidatePath("/production");
  if (accept) redirect(base(m.productionId));
}

export async function updateMember(id: string, memberId: string, fd: FormData) {
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  const m = await db.productionMember.findFirst({ where: { id: memberId, productionId: id } });
  if (!m) return;
  const self = m.userId === user.id;
  if (!access.manage && !self) return;
  const roles = access.manage ? rolesFrom(fd) : m.roles;
  await db.productionMember.update({
    where: { id: memberId },
    data: {
      roles: roles.length ? roles : m.roles,
      isActor: roles.includes("actor") || (access.manage ? fd.get("isActor") === "on" : m.isActor),
      isManager: access.manage ? fd.get("isManager") === "on" || (m.userId !== null && m.userId === (await db.production.findUniqueOrThrow({ where: { id } })).createdById) : m.isManager,
      phone: str(fd, "phone", 40) || null,
    },
  });
  if (access.manage && JSON.stringify(roles) !== JSON.stringify(m.roles)) {
    if (m.userId && m.userId !== user.id) await notify(m.userId, "CREW_ROLE_ASSIGNED", `Your role changed: ${roles.map(roleLabel).join(", ")}`, undefined, base(id));
    await logChange(id, user.id, "crew.role", `${m.name}: ${roles.map(roleLabel).join(", ")}`);
  }
  refresh(id);
}

export async function removeMember(id: string, memberId: string) {
  const user = await requireUser();
  const { production } = await requireProduction(user, id, "manage");
  const m = await db.productionMember.findFirst({ where: { id: memberId, productionId: id } });
  if (!m || m.userId === production.createdById) return;
  await db.productionMember.delete({ where: { id: memberId } });
  await logChange(id, user.id, "crew.remove", `${m.name} removed from the crew`);
  refresh(id);
}

export async function addRoleToMember(id: string, memberId: string, role: string) {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  const m = await db.productionMember.findFirst({ where: { id: memberId, productionId: id } });
  if (!m || m.roles.includes(role)) return;
  await db.productionMember.update({ where: { id: memberId }, data: { roles: [...m.roles, role] } });
  if (m.userId && m.userId !== user.id) await notify(m.userId, "CREW_ROLE_ASSIGNED", `You're ${roleLabel(role)}`, undefined, base(id));
  await logChange(id, user.id, "crew.role", `${m.name} is now also ${roleLabel(role)}`);
  refresh(id);
}

// ── Scenes & shots ───────────────────────────────────────────────────────────

const BRIEF_FIELDS = ["title", "description", "dramaticObjective", "tone", "motivations", "visualIntention", "cameraMovement", "framing", "lighting", "sound", "directorNotes", "dopNotes"] as const;

export async function createScene(id: string, fd: FormData) {
  const user = await requireUser();
  await requireProduction(user, id, "editCreative");
  const count = await db.scene.count({ where: { productionId: id } });
  const scene = await db.scene.create({ data: { productionId: id, number: str(fd, "number", 12) || String(count + 1), title: str(fd, "title", 140), description: str(fd, "description", 2000), order: count, updatedById: user.id } });
  await logChange(id, user.id, "scene.create", `Scene ${scene.number} added`);
  refresh(id);
  redirect(`${base(id)}/scenes/${scene.id}`);
}

export async function updateScene(id: string, sceneId: string, fd: FormData) {
  const user = await requireUser();
  await requireProduction(user, id, "editCreative");
  const data: Record<string, string> = {};
  for (const k of BRIEF_FIELDS) if (fd.has(k)) data[k] = str(fd, k, 3000);
  if (fd.has("number")) data.number = str(fd, "number", 12) || "?";
  const s = await db.scene.update({ where: { id: sceneId, productionId: id }, data: { ...data, updatedById: user.id } });
  await logChange(id, user.id, "scene.update", `Scene ${s.number} brief updated`);
  refresh(id);
}

export async function deleteScene(id: string, sceneId: string) {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  const s = await db.scene.delete({ where: { id: sceneId, productionId: id } });
  await logChange(id, user.id, "scene.delete", `Scene ${s.number} deleted`);
  refresh(id);
  redirect(`${base(id)}/scenes`);
}

export async function moveScene(id: string, sceneId: string, dir: -1 | 1) {
  const user = await requireUser();
  await requireProduction(user, id, "editCreative");
  const scenes = await db.scene.findMany({ where: { productionId: id }, orderBy: [{ order: "asc" }, { number: "asc" }] });
  const i = scenes.findIndex((s) => s.id === sceneId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= scenes.length) return;
  [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  await db.$transaction(scenes.map((s, k) => db.scene.update({ where: { id: s.id }, data: { order: k } })));
  refresh(id);
}

function shotData(fd: FormData) {
  return {
    code: str(fd, "code", 12),
    description: str(fd, "description", 1000),
    size: str(fd, "size", 40),
    angle: str(fd, "angle", 40),
    movement: str(fd, "movement", 60),
    focalLength: num(fd, "focalLength"),
    cameraLabel: str(fd, "cameraLabel", 80) || null,
    sensorLabel: str(fd, "sensorLabel", 80) || null,
    aspect: str(fd, "aspect", 12) || null,
    lens: str(fd, "lens", 80) || null,
    setupMinutes: num(fd, "setupMinutes") !== null ? Math.max(0, Math.round(num(fd, "setupMinutes")!)) : null,
    equipment: str(fd, "equipment", 600),
    intention: str(fd, "intention", 1000),
    dopNotes: str(fd, "dopNotes", 1000),
  };
}

export async function createShot(id: string, sceneId: string, fd: FormData) {
  const user = await requireUser();
  await requireProduction(user, id, "editCreative");
  const scene = await db.scene.findFirstOrThrow({ where: { id: sceneId, productionId: id }, include: { _count: { select: { shots: true } } } });
  const d = shotData(fd);
  const shot = await db.shot.create({ data: { ...d, code: d.code || `${scene.number}${String.fromCharCode(65 + (scene._count.shots % 26))}`, productionId: id, sceneId, order: scene._count.shots } });
  await logChange(id, user.id, "shot.create", `Shot ${shot.code} added`);
  refresh(id);
}

export async function updateShot(id: string, shotId: string, fd: FormData) {
  const user = await requireUser();
  await requireProduction(user, id, "editCreative");
  const d = shotData(fd);
  const shot = await db.shot.update({ where: { id: shotId, productionId: id }, data: { ...d, code: d.code || undefined } });
  await logChange(id, user.id, "shot.update", `Shot ${shot.code} updated`);
  refresh(id);
}

export async function deleteShot(id: string, shotId: string) {
  const user = await requireUser();
  await requireProduction(user, id, "editCreative");
  const refs = await db.shotReference.findMany({ where: { shotId, productionId: id }, select: { storageKey: true } });
  const shot = await db.shot.delete({ where: { id: shotId, productionId: id } });
  for (const r of refs) await deleteUpload(r.storageKey);
  await logChange(id, user.id, "shot.delete", `Shot ${shot.code} deleted`);
  refresh(id);
}

export async function moveShot(id: string, shotId: string, dir: -1 | 1) {
  const user = await requireUser();
  await requireProduction(user, id, "editCreative");
  const shot = await db.shot.findFirstOrThrow({ where: { id: shotId, productionId: id } });
  const shots = await db.shot.findMany({ where: { sceneId: shot.sceneId }, orderBy: [{ order: "asc" }, { code: "asc" }] });
  const i = shots.findIndex((s) => s.id === shotId);
  const j = i + dir;
  if (j < 0 || j >= shots.length) return;
  [shots[i], shots[j]] = [shots[j], shots[i]];
  await db.$transaction(shots.map((s, k) => db.shot.update({ where: { id: s.id }, data: { order: k } })));
  refresh(id);
}

const SHOT_STATUSES: ShotStatus[] = ["PLANNED", "PREPARING", "READY", "SHOOTING", "COMPLETED", "SKIPPED", "PICKUP"];

export async function setShotStatus(id: string, shotId: string, status: ShotStatus) {
  const user = await requireUser();
  await requireProduction(user, id, "liveUpdate");
  if (!SHOT_STATUSES.includes(status)) return;
  const now = new Date();
  const shot = await db.shot.findFirstOrThrow({ where: { id: shotId, productionId: id } });
  await db.shot.update({
    where: { id: shotId },
    data: {
      status,
      prepStartedAt: status === "PREPARING" ? now : status === "PLANNED" ? null : shot.prepStartedAt ?? (status === "COMPLETED" ? null : now),
      shootStartedAt: status === "SHOOTING" ? now : shot.shootStartedAt,
      completedAt: status === "COMPLETED" ? now : status === "PLANNED" || status === "PREPARING" ? null : shot.completedAt,
    },
  });
  // A new setup starts: departments confirm readiness again.
  if (status === "PREPARING") await db.departmentReadiness.updateMany({ where: { productionId: id }, data: { ready: false, note: "" } });
  await logChange(id, user.id, "shot.status", `Shot ${shot.code}: ${status.toLowerCase()}`);
  refresh(id);
}

export async function addComment(id: string, targetType: "scene" | "shot" | "reference" | "task", targetId: string, fd: FormData) {
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (access.limited || access.staffView) {
    if (!user.roles.includes("INSTRUCTOR") && !user.roles.includes("ADMIN")) return;
  }
  const body = str(fd, "body", 1500);
  if (!body) return;
  await db.productionComment.create({ data: { productionId: id, targetType, targetId, authorId: user.id, body } });
  await logChange(id, user.id, "comment", "New comment");
  refresh(id);
}

// ── Viewfinder references ────────────────────────────────────────────────────

export async function saveReference(_: FormState, fd: FormData): Promise<FormState & { href?: string }> {
  const user = await requireUser();
  const id = str(fd, "productionId", 40);
  await requireProduction(user, id, "editCreative");
  if (!rateLimit(`reference:${user.id}`, 120, 3600_000).ok) return { error: "Too many uploads in a short time. Please wait a little." };
  const file = fd.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Capture a frame first." };
  if (!["image/jpeg", "image/png"].includes(file.type)) return { error: "Only PNG and JPEG pictures are allowed." };
  let shotId = str(fd, "shotId", 40);
  if (!shotId) {
    const sceneId = str(fd, "sceneId", 40);
    const scene = await db.scene.findFirst({ where: { id: sceneId, productionId: id }, include: { _count: { select: { shots: true } } } });
    if (!scene) return { error: "Choose a scene." };
    const shot = await db.shot.create({
      data: {
        productionId: id,
        sceneId,
        order: scene._count.shots,
        code: str(fd, "newShotCode", 12) || `${scene.number}${String.fromCharCode(65 + (scene._count.shots % 26))}`,
        description: str(fd, "newShotDescription", 1000),
        focalLength: num(fd, "focalLength"),
        cameraLabel: str(fd, "cameraLabel", 80) || null,
        sensorLabel: str(fd, "sensorLabel", 80) || null,
        aspect: str(fd, "aspect", 12) || null,
      },
    });
    shotId = shot.id;
  } else if (!(await db.shot.findFirst({ where: { id: shotId, productionId: id } }))) return { error: "Choose a shot." };
  let stored: Awaited<ReturnType<typeof storeUpload>>;
  try {
    stored = await storeUpload(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
  const ref = await db.shotReference.create({
    data: {
      productionId: id,
      shotId,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      focalLength: num(fd, "focalLength"),
      cameraLabel: str(fd, "cameraLabel", 80) || null,
      sensorLabel: str(fd, "sensorLabel", 80) || null,
      sensorWidthMm: num(fd, "sensorWidthMm"),
      sensorHeightMm: num(fd, "sensorHeightMm"),
      aspect: str(fd, "aspect", 12) || null,
      calibrated: fd.get("calibrated") === "true",
      phoneFovDeg: num(fd, "phoneFovDeg"),
      note: str(fd, "note", 600),
      createdById: user.id,
    },
  });
  const shot = await db.shot.findUniqueOrThrow({ where: { id: shotId } });
  if (!shot.focalLength && ref.focalLength) await db.shot.update({ where: { id: shotId }, data: { focalLength: ref.focalLength, cameraLabel: ref.cameraLabel, sensorLabel: ref.sensorLabel, aspect: ref.aspect } });
  await logChange(id, user.id, "reference.add", `Reference frame saved to shot ${shot.code}${ref.focalLength ? ` (${ref.focalLength} mm)` : ""}`);
  refresh(id);
  return { ok: "Saved to the shot list.", href: `${base(id)}/scenes/${shot.sceneId}#shot-${shotId}` };
}

export async function choosePreferredReference(id: string, shotId: string, refId: string) {
  const user = await requireUser();
  await requireProduction(user, id, "editCreative");
  const ref = await db.shotReference.findFirstOrThrow({ where: { id: refId, shotId, productionId: id } });
  const shot = await db.shot.update({
    where: { id: shotId },
    data: { preferredReferenceId: refId, focalLength: ref.focalLength ?? undefined, cameraLabel: ref.cameraLabel ?? undefined, sensorLabel: ref.sensorLabel ?? undefined, aspect: ref.aspect ?? undefined },
  });
  await logChange(id, user.id, "reference.choose", `Preferred framing chosen for shot ${shot.code}${ref.focalLength ? `: ${ref.focalLength} mm` : ""}`);
  refresh(id);
}

export async function deleteReference(id: string, refId: string) {
  const user = await requireUser();
  await requireProduction(user, id, "editCreative");
  const ref = await db.shotReference.delete({ where: { id: refId, productionId: id } });
  await deleteUpload(ref.storageKey);
  await db.shot.updateMany({ where: { preferredReferenceId: refId }, data: { preferredReferenceId: null } });
  refresh(id);
}

// ── Tasks ────────────────────────────────────────────────────────────────────

const PRIORITIES: TaskPriority[] = ["LOW", "NORMAL", "HIGH"];
const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export async function createTask(id: string, fd: FormData) {
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (access.limited || (!access.member && !access.manage)) return;
  const title = str(fd, "title", 200);
  if (!title) return;
  const assigneeId = str(fd, "assigneeId", 40) || null;
  const assignee = assigneeId ? await db.productionMember.findFirst({ where: { id: assigneeId, productionId: id } }) : null;
  const due = str(fd, "due", 30);
  const priority = (PRIORITIES as string[]).includes(str(fd, "priority")) ? (str(fd, "priority") as TaskPriority) : "NORMAL";
  const task = await db.productionTask.create({
    data: {
      productionId: id,
      title,
      description: str(fd, "description", 2000),
      assigneeId: assignee?.id ?? null,
      department: str(fd, "department", 40),
      sceneId: str(fd, "sceneId", 40) || null,
      due: due ? new Date(due) : null,
      priority,
      createdById: user.id,
    },
  });
  if (assignee?.userId && assignee.userId !== user.id) await notify(assignee.userId, "TASK_ASSIGNED", `New task: ${title}`, undefined, `${base(id)}/tasks#task-${task.id}`);
  await logChange(id, user.id, "task.create", `Task added: ${title}`);
  refresh(id, "/production");
}

export async function setTaskStatus(id: string, taskId: string, status: TaskStatus) {
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  const task = await db.productionTask.findFirst({ where: { id: taskId, productionId: id }, include: { assignee: true } });
  if (!task || !TASK_STATUSES.includes(status)) return;
  const mine = task.assignee?.userId === user.id || task.createdById === user.id;
  if (!access.manage && !mine) return;
  await db.productionTask.update({ where: { id: taskId }, data: { status } });
  await logChange(id, user.id, "task.status", `Task "${task.title}": ${status.toLowerCase().replace("_", " ")}`);
  refresh(id, "/production");
}

export async function deleteTask(id: string, taskId: string) {
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  const task = await db.productionTask.findFirst({ where: { id: taskId, productionId: id } });
  if (!task || (!access.manage && task.createdById !== user.id)) return;
  await db.productionTask.delete({ where: { id: taskId } });
  refresh(id, "/production");
}

// ── Call sheets ──────────────────────────────────────────────────────────────

function callSheetFromForm(fd: FormData, memberIds: string[]): CallSheetData {
  const departments: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("dept:")) departments[k.slice(5)] = String(v);
  const memberCalls: Record<string, string> = {};
  for (const mid of memberIds) {
    const v = str(fd, `call:${mid}`, 10);
    if (v) memberCalls[mid] = v;
  }
  const times = fd.getAll("schedTime").map(String);
  const labels = fd.getAll("schedLabel").map(String);
  const scenes = fd.getAll("schedScene").map(String);
  const minutes = fd.getAll("schedMinutes").map(String);
  const schedule = labels
    .map((label, i) => ({ time: times[i] ?? "", label, sceneId: scenes[i] ?? "", minutes: Number(minutes[i] || 0) }))
    .filter((r) => r.label.trim() || r.time.trim());
  return CallSheetData.parse({
    date: str(fd, "date", 20),
    location: str(fd, "location", 160),
    address: str(fd, "address", 240),
    generalCall: str(fd, "generalCall", 10),
    parking: str(fd, "parking", 600),
    meals: str(fd, "meals", 400),
    weather: str(fd, "weather", 160),
    emergencyContact: str(fd, "emergencyContact", 200),
    nearestHospital: str(fd, "nearestHospital", 240),
    safety: str(fd, "safety", 1200),
    notes: str(fd, "notes", 1500),
    equipment: str(fd, "equipment", 1500),
    departments,
    memberCalls,
    schedule,
  });
}

export async function saveCallSheetDraft(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  const members = await db.productionMember.findMany({ where: { productionId: id }, select: { id: true } });
  let data: CallSheetData;
  try {
    data = callSheetFromForm(fd, members.map((m) => m.id));
  } catch (e) {
    return { error: e instanceof z.ZodError ? "Check the times — use HH:MM, e.g. 08:30." : "Could not save." };
  }
  const draft = await db.callSheetVersion.findFirst({ where: { productionId: id, state: "DRAFT" } });
  if (draft) await db.callSheetVersion.update({ where: { id: draft.id }, data: { data } });
  else await db.callSheetVersion.create({ data: { productionId: id, state: "DRAFT", data } });
  if (fd.get("intent") === "publish") return publishCallSheet(id, str(fd, "changeSummary", 400));
  refresh(id);
  return { ok: "Draft saved." };
}

async function publishCallSheet(id: string, note: string): Promise<FormState> {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  const draft = await db.callSheetVersion.findFirst({ where: { productionId: id, state: "DRAFT" } });
  if (!draft) return { error: "Nothing to publish." };
  const last = await db.callSheetVersion.findFirst({ where: { productionId: id, state: "PUBLISHED" }, orderBy: { version: "desc" } });
  const members = await db.productionMember.findMany({ where: { productionId: id }, select: { id: true, name: true } });
  const next = CallSheetData.parse(draft.data);
  const diff = diffCallSheets(last ? CallSheetData.parse(last.data) : null, next, Object.fromEntries(members.map((m) => [m.id, m.name])));
  const version = (last?.version ?? 0) + 1;
  const summary = [note, ...diff.changes].filter(Boolean).join(" · ").slice(0, 600);
  await db.callSheetVersion.create({ data: { productionId: id, state: "PUBLISHED", version, data: next, changeSummary: summary, important: diff.important, publishedAt: new Date(), publishedById: user.id } });
  await logChange(id, user.id, "callsheet.publish", `Call sheet v${version} published${diff.important ? " — times or location changed" : ""}`, {
    important: true,
    href: `${base(id)}/callsheet`,
    notifyKind: diff.important && last ? "CALL_TIME_CHANGED" : "CALL_SHEET_PUBLISHED",
  });
  refresh(id);
  return { ok: "Published. The crew has been notified." };
}

export async function acknowledgeCallSheet(id: string, versionId: string) {
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (!access.member || access.member.status !== "ACCEPTED") return;
  const v = await db.callSheetVersion.findFirst({ where: { id: versionId, productionId: id, state: "PUBLISHED" } });
  if (!v) return;
  await db.callSheetAcknowledgement.upsert({ where: { versionId_memberId: { versionId, memberId: access.member.id } }, create: { versionId, memberId: access.member.id }, update: {} });
  await logChange(id, user.id, "callsheet.ack", "Call sheet confirmed");
  refresh(id);
}

// ── Documents ────────────────────────────────────────────────────────────────

export async function uploadDocument(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (access.limited || (!access.member && !access.manage)) return { error: "Only crew can add documents." };
  if (!rateLimit(`proddoc:${user.id}`, 60, 3600_000).ok) return { error: "Too many uploads in a short time. Please wait a little." };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  const documentId = str(fd, "documentId", 40);
  let stored: Awaited<ReturnType<typeof storeUpload>>;
  try {
    stored = await storeUpload(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
  if (documentId) {
    const doc = await db.productionDocument.findFirst({ where: { id: documentId, productionId: id, deletedAt: null }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
    if (!doc) return { error: "Document not found." };
    if (!access.manage && doc.createdById !== user.id) return { error: "Only the document's owner or a production manager can add versions." };
    const version = (doc.versions[0]?.version ?? 0) + 1;
    await db.productionDocumentVersion.create({ data: { documentId, version, ...stored, note: str(fd, "note", 300), uploadedById: user.id } });
    await logChange(id, user.id, "document.version", `${doc.title}: version ${version} uploaded`, { important: doc.kind === "Screenplay" || doc.kind === "Shooting schedule" });
    refresh(id);
    return { ok: "New version added. Earlier versions are kept." };
  }
  const title = str(fd, "title", 140) || stored.fileName;
  await db.productionDocument.create({
    data: {
      productionId: id,
      kind: str(fd, "kind", 40) || "Production notes",
      title,
      sceneId: str(fd, "sceneId", 40) || null,
      taskId: str(fd, "taskId", 40) || null,
      createdById: user.id,
      versions: { create: { version: 1, ...stored, note: str(fd, "note", 300), uploadedById: user.id } },
    },
  });
  await logChange(id, user.id, "document.add", `Document added: ${title}`);
  refresh(id);
  return { ok: "Document added." };
}

export async function deleteDocument(id: string, documentId: string) {
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  const doc = await db.productionDocument.findFirst({ where: { id: documentId, productionId: id } });
  if (!doc || (!access.manage && doc.createdById !== user.id)) return;
  await db.productionDocument.update({ where: { id: documentId }, data: { deletedAt: new Date() } });
  await logChange(id, user.id, "document.delete", `Document removed: ${doc.title}`);
  refresh(id);
}

// ── Announcements, readiness, takes ──────────────────────────────────────────

export async function postAnnouncement(id: string, fd: FormData) {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  const body = str(fd, "body", 1000);
  if (!body) return;
  const important = fd.get("important") === "on";
  await db.productionAnnouncement.create({ data: { productionId: id, body, important, authorId: user.id } });
  await logChange(id, user.id, "announcement", body.slice(0, 140), { important, notifyKind: "PRODUCTION_ANNOUNCEMENT" });
  refresh(id);
}

export async function setReadiness(id: string, department: Department, ready: boolean) {
  const user = await requireUser();
  const { access } = await requireProduction(user, id);
  if (!access.readyDepartments.includes(department)) return;
  await db.departmentReadiness.upsert({ where: { productionId_department: { productionId: id, department } }, create: { productionId: id, department, ready, updatedById: user.id }, update: { ready, updatedById: user.id } });
  await logChange(id, user.id, "readiness", `${department}: ${ready ? "ready" : "not ready"}`);
  refresh(id);
}

export async function addTake(id: string, shotId: string, fd: FormData) {
  const user = await requireUser();
  await requireProduction(user, id, "logTakes");
  const shot = await db.shot.findFirstOrThrow({ where: { id: shotId, productionId: id } });
  const last = await db.takeLog.findFirst({ where: { shotId }, orderBy: { take: "desc" } });
  const photo = fd.get("photo");
  let stored: Awaited<ReturnType<typeof storeUpload>> | null = null;
  if (photo instanceof File && photo.size > 0 && ["image/jpeg", "image/png"].includes(photo.type)) stored = await storeUpload(photo);
  const take = (last?.take ?? 0) + 1;
  await db.takeLog.create({
    data: {
      productionId: id,
      sceneId: shot.sceneId,
      shotId,
      take,
      notes: str(fd, "notes", 1000),
      continuity: str(fd, "continuity", 1000),
      soundIssue: str(fd, "soundIssue", 300),
      cameraIssue: str(fd, "cameraIssue", 300),
      preferred: fd.get("preferred") === "on",
      photoKey: stored?.storageKey,
      photoMime: stored?.mimeType,
      createdById: user.id,
    },
  });
  await logChange(id, user.id, "take", `Shot ${shot.code}, take ${take} logged`);
  refresh(id);
}

export async function togglePreferredTake(id: string, takeId: string) {
  const user = await requireUser();
  await requireProduction(user, id, "logTakes");
  const t = await db.takeLog.findFirstOrThrow({ where: { id: takeId, productionId: id } });
  await db.takeLog.update({ where: { id: takeId }, data: { preferred: !t.preferred } });
  refresh(id);
}

// ── Wrap & reflection ────────────────────────────────────────────────────────

export async function updateWrapReport(id: string, fd: FormData) {
  const user = await requireUser();
  await requireProduction(user, id, "manage");
  await db.wrapReport.upsert({
    where: { productionId: id },
    create: { productionId: id, wrappedById: user.id, notes: str(fd, "notes", 3000), technicalProblems: str(fd, "technicalProblems", 3000), scheduleChanges: str(fd, "scheduleChanges", 3000) },
    update: { notes: str(fd, "notes", 3000), technicalProblems: str(fd, "technicalProblems", 3000), scheduleChanges: str(fd, "scheduleChanges", 3000) },
  });
  refresh(id);
}

/**
 * Saves a student's role-based reflection. Optionally turns the production into a portfolio
 * project with the role's skills linked as *practice* — no rubric level, so mastery doesn't
 * move until the student maps levels and peers or instructors add feedback.
 */
export async function submitReflection(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const { access, production } = await requireProduction(user, id);
  const m = access.member;
  if (!m || m.status !== "ACCEPTED") return { error: "Only crew members can reflect on this production." };
  if (!["WRAPPED", "POST_PRODUCTION", "COMPLETED"].includes(production.status)) return { error: "Reflections open once the production has wrapped." };
  const answers = fd.getAll("answer").map((a) => String(a).trim().slice(0, 2000));
  const questions = fd.getAll("question").map(String);
  if (answers.filter(Boolean).length === 0) return { error: "Answer at least one question." };
  const existing = await db.productionReflection.findUnique({ where: { productionId_userId: { productionId: id, userId: user.id } } });
  if (existing) return { error: "You've already reflected on this production." };
  const roleText = m.roles.map(roleLabel).join(", ") || "Crew";
  let projectId: string | null = null;
  if (fd.get("addToPortfolio") === "on") {
    const p = await db.production.findUniqueOrThrow({ where: { id } });
    const project = await db.project.create({
      data: {
        ownerId: user.id,
        title: p.title,
        type: "DIRECTING_WORKSHOP",
        description: p.description || `${p.type} at ${p.location}`,
        startDate: p.shootDate,
        studentRole: roleText.slice(0, 80),
        objectives: [],
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    projectId = project.id;
    const skills = [...new Set(m.roles.flatMap((r) => ROLE_SKILLS[r] ?? []))];
    for (const skillId of skills) {
      const exists = await db.skill.findUnique({ where: { id: skillId } });
      if (exists) await db.skillEvidenceLink.create({ data: { projectId: project.id, skillId, relevance: "PRIMARY", justification: `Practised as ${roleText} on this production.` } });
    }
    await awardXp(user.id, "PROJECT_CREATED", project.id);
    if (skills.length) await recomputeMastery(user.id, skills);
  }
  const body = questions.map((q, i) => `${q}\n${answers[i] ?? ""}`).join("\n\n");
  await db.productionReflection.create({ data: { productionId: id, userId: user.id, role: roleText, answers: Object.fromEntries(questions.map((q, i) => [q, answers[i] ?? ""])), projectId } });
  const reflection = await db.reflection.create({ data: { userId: user.id, projectId, title: `Reflection — ${roleText}`, answers: Object.fromEntries(questions.map((q, i) => [q, answers[i] ?? ""])), body } });
  await awardXp(user.id, "REFLECTION", reflection.id, reflectionQuality(body, answers.filter(Boolean).length));
  await logChange(id, user.id, "reflection", "A crew member reflected on the shoot");
  refresh(id, "/production");
  if (projectId) redirect(`/projects/${projectId}?fromProduction=1`);
  return { ok: "Reflection saved." };
}
