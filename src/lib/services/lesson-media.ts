import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { canManageLessonMedia, canViewLessonMedia, type Viewer } from "@/lib/auth/policy";
import { toViewer } from "./access";

const withCohorts = { uploader: { select: { profile: { select: { displayName: true } }, memberships: { select: { cohortId: true } } } } } as const;

type Row = Awaited<ReturnType<typeof loadLesson>>[number];

async function loadLesson(lessonId: string) {
  return db.lessonMedia.findMany({ where: { lessonId, deletedAt: null }, include: withCohorts, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] });
}

const facts = (m: Row) => ({
  kind: m.kind,
  visibility: m.visibility,
  uploaderId: m.uploaderId,
  deletedAt: m.deletedAt,
  uploaderCohortIds: m.uploader.memberships.map((c) => c.cohortId),
});

export interface LessonPhoto {
  id: string;
  kind: "REFERENCE" | "EXAMPLE";
  visibility: "PRIVATE" | "SHARED";
  src: string;
  afterSrc: string | null;
  beforeLabel: string | null;
  afterLabel: string | null;
  caption: string;
  credit: string;
  license: string;
  sourceUrl: string | null;
  pinned: boolean;
  mine: boolean;
  canManage: boolean;
  uploaderName: string;
}

function toPhoto(m: Row, viewer: Viewer): LessonPhoto {
  return {
    id: m.id,
    kind: m.kind,
    visibility: m.visibility,
    src: `/api/lesson-media/${m.id}`,
    afterSrc: m.afterStorageKey ? `/api/lesson-media/${m.id}?side=after` : null,
    beforeLabel: m.beforeLabel,
    afterLabel: m.afterLabel,
    caption: m.caption,
    credit: m.credit,
    license: m.license,
    sourceUrl: m.sourceUrl,
    pinned: m.pinned,
    mine: m.uploaderId === viewer.id,
    canManage: canManageLessonMedia(viewer, m),
    uploaderName: m.uploader.profile?.displayName ?? "—",
  };
}

/** Every picture on a lesson the user may see: references, their own examples, and shared ones. */
export async function getLessonPhotos(user: CurrentUser, lessonId: string) {
  const viewer = await toViewer(user);
  const rows = (await loadLesson(lessonId)).filter((m) => canViewLessonMedia(viewer, facts(m)));
  const photos = rows.map((m) => toPhoto(m, viewer));
  return {
    references: photos.filter((p) => p.kind === "REFERENCE"),
    mine: photos.filter((p) => p.kind === "EXAMPLE" && p.mine),
    shared: photos.filter((p) => p.kind === "EXAMPLE" && !p.mine),
  };
}

/** Loads one picture if the user may see it — used by the file route. */
export async function getViewablePhoto(user: CurrentUser, id: string) {
  const m = await db.lessonMedia.findUnique({ where: { id }, include: withCohorts });
  if (!m) return null;
  return canViewLessonMedia(await toViewer(user), facts(m)) ? m : null;
}

export async function getManageablePhoto(user: CurrentUser, id: string) {
  const m = await db.lessonMedia.findUnique({ where: { id } });
  if (!m) return null;
  return canManageLessonMedia(await toViewer(user), m) ? m : null;
}

/** How many reference pictures each lesson has — for the curator's shot list. */
export async function referenceCounts() {
  const rows = await db.lessonMedia.groupBy({ by: ["lessonId"], where: { kind: "REFERENCE", deletedAt: null }, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.lessonId, r._count._all]));
}
