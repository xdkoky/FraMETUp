"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canCurateLessonMedia } from "@/lib/auth/policy";
import { toViewer } from "@/lib/services/access";
import { getManageablePhoto } from "@/lib/services/lesson-media";
import { awardXp } from "@/lib/services/xp";
import { audit } from "@/lib/services/audit";
import { rateLimit } from "@/lib/rate-limit";
import { deleteUpload, storeUpload } from "@/lib/uploads";
import { LESSON_BY_ID } from "@/lib/learn";

export type PhotoState = { error?: string; ok?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

const LICENSES = ["Own work", "CC BY 4.0", "CC BY-SA 4.0", "CC0", "Public domain", "Used with permission"] as const;
const IMAGE_TYPES = ["image/png", "image/jpeg"];

const PhotoSchema = z.object({
  kind: z.enum(["REFERENCE", "EXAMPLE"]),
  visibility: z.enum(["PRIVATE", "SHARED"]).default("PRIVATE"),
  caption: z.string().trim().min(3, "Say in a few words what the picture shows.").max(300),
  credit: z.string().trim().max(120).optional(),
  license: z.enum(LICENSES).default("Own work"),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || /^https:\/\//.test(v), "Use an https:// link."),
  beforeLabel: z.string().trim().max(40).optional(),
  afterLabel: z.string().trim().max(40).optional(),
  rightsConfirmed: z.literal("on", { errorMap: () => ({ message: "Please confirm you may share this picture." }) }),
});

function pickFile(formData: FormData, name: string) {
  const f = formData.get(name);
  return f instanceof File && f.size > 0 ? f : null;
}

export async function uploadLessonPhoto(lessonId: string, _: PhotoState, formData: FormData): Promise<PhotoState> {
  const user = await requireUser();
  if (!LESSON_BY_ID[lessonId]) return { error: "Unknown lesson." };
  if (!rateLimit(`lesson-photo:${user.id}`, 30, 3600_000).ok) return { error: "Too many uploads in a short time. Please wait a little." };

  const fields = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = PhotoSchema.safeParse(fields);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  if (d.kind === "REFERENCE" && !canCurateLessonMedia(await toViewer(user))) return { error: "Only instructors can add reference pictures." };
  if (d.license !== "Own work" && !d.sourceUrl && d.kind === "REFERENCE") return { fieldErrors: { sourceUrl: ["Add a link to where the picture comes from."] } };

  const file = pickFile(formData, "file");
  const afterFile = d.kind === "REFERENCE" ? pickFile(formData, "afterFile") : null;
  if (!file) return { fieldErrors: { file: ["Choose a PNG or JPEG picture."] } };
  for (const f of [file, afterFile]) if (f && !IMAGE_TYPES.includes(f.type)) return { fieldErrors: { file: ["Only PNG and JPEG pictures are allowed."] } };

  let main: Awaited<ReturnType<typeof storeUpload>>;
  let after: Awaited<ReturnType<typeof storeUpload>> | null = null;
  try {
    main = await storeUpload(file);
    if (afterFile) after = await storeUpload(afterFile);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  const media = await db.lessonMedia.create({
    data: {
      lessonId,
      uploaderId: user.id,
      kind: d.kind,
      visibility: d.kind === "REFERENCE" ? "SHARED" : d.visibility,
      storageKey: main.storageKey,
      mimeType: main.mimeType,
      afterStorageKey: after?.storageKey,
      afterMimeType: after?.mimeType,
      beforeLabel: after ? d.beforeLabel || null : null,
      afterLabel: after ? d.afterLabel || null : null,
      caption: d.caption,
      credit: d.credit || user.displayName,
      license: d.license,
      sourceUrl: d.sourceUrl ?? null,
    },
  });
  if (d.kind === "EXAMPLE") await awardXp(user.id, "EVIDENCE_ADDED", `lesson-photo:${media.id}`);
  await audit(user.id, "lesson_photo.upload", "LessonMedia", media.id, { kind: d.kind, lessonId });
  revalidatePath(`/learn/${lessonId}`);
  return { ok: d.kind === "REFERENCE" ? "Reference added." : "Photo added." };
}

export async function deleteLessonPhoto(id: string) {
  const user = await requireUser();
  const m = await getManageablePhoto(user, id);
  if (!m) return;
  await db.lessonMedia.update({ where: { id }, data: { deletedAt: new Date() } });
  for (const key of [m.storageKey, m.afterStorageKey]) if (key) await deleteUpload(key);
  await audit(user.id, "lesson_photo.delete", "LessonMedia", id);
  revalidatePath(`/learn/${m.lessonId}`);
}

export async function setLessonPhotoVisibility(id: string, visibility: "PRIVATE" | "SHARED") {
  const user = await requireUser();
  const m = await getManageablePhoto(user, id);
  if (!m || m.kind !== "EXAMPLE" || m.uploaderId !== user.id) return;
  await db.lessonMedia.update({ where: { id }, data: { visibility, pinned: visibility === "PRIVATE" ? false : m.pinned } });
  revalidatePath(`/learn/${m.lessonId}`);
}

export async function toggleLessonPhotoPin(id: string) {
  const user = await requireUser();
  if (!canCurateLessonMedia(await toViewer(user))) return;
  const m = await getManageablePhoto(user, id);
  if (!m || m.visibility !== "SHARED") return;
  await db.lessonMedia.update({ where: { id }, data: { pinned: !m.pinned } });
  revalidatePath(`/learn/${m.lessonId}`);
}
