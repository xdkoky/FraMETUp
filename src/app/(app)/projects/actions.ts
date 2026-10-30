"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { EvidenceSchema, LinkSkillSchema, PROJECT_STATUSES, ProjectSchema } from "@/lib/validation/project";
import { assertCanEditProject } from "@/lib/services/access";
import { audit } from "@/lib/services/audit";
import { recomputeMastery } from "@/lib/services/mastery";
import { awardXp } from "@/lib/services/xp";
import { deleteUpload, storeUpload } from "@/lib/uploads";
import { rateLimit } from "@/lib/rate-limit";
import { reflectionQuality } from "@/lib/xp/xp";
import { REFLECTION_PROMPTS } from "@/lib/reflection";

export type ActionState = { error?: string; ok?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

function formObject(formData: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

export async function createProject(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!rateLimit(`project-create:${user.id}`, 30, 3600_000).ok) return { error: "You're creating projects very quickly. Please wait a moment." };
  const parsed = ProjectSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const project = await db.project.create({
    data: { ...d, semester: d.semester ?? null, ownerId: user.id, completedAt: d.status === "COMPLETED" ? new Date() : null },
  });
  await awardXp(user.id, "PROJECT_CREATED", project.id);
  if (d.status === "COMPLETED") await awardXp(user.id, "PROJECT_COMPLETED", project.id);
  await audit(user.id, "project.create", "Project", project.id);

  // Optional skill pre-link from "Link a project" on the tree
  const linkSkill = formData.get("linkSkill");
  if (typeof linkSkill === "string" && linkSkill && (await db.skill.findUnique({ where: { id: linkSkill } }))) {
    await db.skillEvidenceLink.create({ data: { projectId: project.id, skillId: linkSkill, relevance: "PRIMARY" } });
  }
  redirect(`/projects/${project.id}?created=1`);
}

export async function updateProject(projectId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  const parsed = ProjectSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const before = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  await db.project.update({
    where: { id: projectId },
    data: {
      ...d,
      semester: d.semester ?? null,
      completedAt: d.status === "COMPLETED" ? (before.completedAt ?? new Date()) : null,
    },
  });
  if (d.status === "COMPLETED" && before.status !== "COMPLETED") await awardXp(user.id, "PROJECT_COMPLETED", projectId);
  if (d.visibility !== before.visibility) await audit(user.id, "project.visibility_change", "Project", projectId, { from: before.visibility, to: d.visibility });
  // Revisiting a project completed more than 30 days ago is meaningful practice.
  if (before.completedAt && Date.now() - before.completedAt.getTime() > 30 * 86400000) await awardXp(user.id, "PROJECT_REVISITED", `${projectId}:${new Date().toISOString().slice(0, 7)}`);
  redirect(`/projects/${projectId}`);
}

export async function setProjectStatus(projectId: string, formData: FormData) {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  const status = z.enum(PROJECT_STATUSES).parse(formData.get("status"));
  const before = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  await db.project.update({
    where: { id: projectId },
    data: { status, completedAt: status === "COMPLETED" ? (before.completedAt ?? new Date()) : null },
  });
  if (status === "COMPLETED" && before.status !== "COMPLETED") {
    await awardXp(user.id, "PROJECT_COMPLETED", projectId);
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}/reflect?completed=1`);
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  await db.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
  await audit(user.id, "project.delete", "Project", projectId);
  // Evidence from a deleted project no longer counts.
  await recomputeMastery(user.id);
  redirect("/projects");
}

export async function linkSkill(projectId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  const parsed = LinkSkillSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (!(await db.skill.findUnique({ where: { id: d.skillId } }))) return { error: "Unknown skill." };
  const evidenceId = formData.get("evidenceId");
  await db.skillEvidenceLink.upsert({
    where: { projectId_skillId: { projectId, skillId: d.skillId } },
    create: { projectId, ...d, evidenceId: typeof evidenceId === "string" && evidenceId ? evidenceId : null },
    update: { ...d },
  });
  await recomputeMastery(user.id, [d.skillId]);
  revalidatePath(`/projects/${projectId}`);
  return { ok: "Skill evidence saved. Your development overview has been updated." };
}

export async function unlinkSkill(projectId: string, skillId: string) {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  await db.skillEvidenceLink.deleteMany({ where: { projectId, skillId } });
  await recomputeMastery(user.id, [skillId]);
  revalidatePath(`/projects/${projectId}`);
}

export async function addEvidence(projectId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  if (!rateLimit(`evidence:${user.id}`, 60, 3600_000).ok) return { error: "Too many uploads in a short time. Please wait a little." };

  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const fields = formObject(formData);
  if (hasFile && !fields.kind) fields.kind = "NOTE";
  const parsed = EvidenceSchema.safeParse(fields);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let fileMeta: Awaited<ReturnType<typeof storeUpload>> | null = null;
  if (hasFile) {
    if (!parsed.data.rightsConfirmed) return { fieldErrors: { rightsConfirmed: ["Please confirm you have the right to store this file."] } };
    try {
      fileMeta = await storeUpload(file);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed." };
    }
  }
  const ev = await db.projectEvidence.create({
    data: {
      projectId,
      ...parsed.data,
      kind: fileMeta ? "FILE" : parsed.data.kind,
      ...(fileMeta ?? {}),
    },
  });
  await awardXp(user.id, "EVIDENCE_ADDED", ev.id);
  if (fileMeta) await audit(user.id, "evidence.upload", "ProjectEvidence", ev.id, { size: fileMeta.sizeBytes, type: fileMeta.mimeType });
  // Artifacts strengthen project evidence weight for linked skills.
  const linked = await db.skillEvidenceLink.findMany({ where: { projectId }, select: { skillId: true } });
  if (linked.length) await recomputeMastery(user.id, linked.map((l) => l.skillId));
  revalidatePath(`/projects/${projectId}`);
  return { ok: "Evidence added." };
}

export async function removeEvidence(projectId: string, evidenceId: string) {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  const ev = await db.projectEvidence.findFirst({ where: { id: evidenceId, projectId } });
  if (!ev) return;
  await db.projectEvidence.update({ where: { id: evidenceId }, data: { deletedAt: new Date() } });
  if (ev.storageKey) await deleteUpload(ev.storageKey);
  await audit(user.id, "evidence.delete", "ProjectEvidence", evidenceId);
  const linked = await db.skillEvidenceLink.findMany({ where: { projectId }, select: { skillId: true } });
  if (linked.length) await recomputeMastery(user.id, linked.map((l) => l.skillId));
  revalidatePath(`/projects/${projectId}`);
}

const CollaboratorSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)),
});

export async function addCollaborator(projectId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  const parsed = CollaboratorSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, role, email } = parsed.data;
  let userId: string | null = null;
  if (email) {
    const match = await db.user.findFirst({ where: { email, deletedAt: null } });
    if (match && match.id !== user.id) {
      userId = match.id;
      if (await db.projectCollaborator.findFirst({ where: { projectId, userId } })) return { error: "That person is already a collaborator." };
    }
  }
  await db.projectCollaborator.create({ data: { projectId, name, role, userId } });
  revalidatePath(`/projects/${projectId}`);
  const t = await getT();
  return { ok: userId ? t("{name} was added and linked to their FraMETUp account.", { name }) : t("{name} was added.", { name }) };
}

export async function removeCollaborator(projectId: string, collaboratorId: string) {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  await db.projectCollaborator.deleteMany({ where: { id: collaboratorId, projectId } });
  revalidatePath(`/projects/${projectId}`);
}


export async function saveReflection(projectId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  await assertCanEditProject(user, projectId);
  const answers: Record<string, string> = {};
  for (const p of REFLECTION_PROMPTS) {
    const v = String(formData.get(p.key) ?? "").trim().slice(0, 4000);
    if (v) answers[p.key] = v;
  }
  const title = String(formData.get("title") ?? "").trim().slice(0, 140) || "Project reflection";
  const visibility = formData.get("visibility") === "COLLABORATORS" ? "COLLABORATORS" : "PRIVATE";
  if (Object.keys(answers).length < 2) return { error: "Answer at least two prompts — a reflection is for you, so be honest and specific." };
  const body = REFLECTION_PROMPTS.filter((p) => answers[p.key]).map((p) => `${p.label}\n${answers[p.key]}`).join("\n\n");
  const reflection = await db.reflection.create({ data: { userId: user.id, projectId, title, answers, body, visibility } });
  await awardXp(user.id, "REFLECTION", reflection.id, reflectionQuality(body, Object.keys(answers).length));
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?reflected=${reflection.id}`);
}

export async function deleteReflection(projectId: string, reflectionId: string) {
  const user = await requireUser();
  await db.reflection.updateMany({ where: { id: reflectionId, userId: user.id }, data: { deletedAt: new Date() } });
  await audit(user.id, "reflection.delete", "Reflection", reflectionId);
  revalidatePath(`/projects/${projectId}`);
}
