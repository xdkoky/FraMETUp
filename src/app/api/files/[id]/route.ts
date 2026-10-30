import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewProject } from "@/lib/auth/policy";
import { toViewer } from "@/lib/services/access";
import { readUpload } from "@/lib/uploads";

/** Serves uploaded evidence only to users who may view the project. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ev = await db.projectEvidence.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          collaborators: { select: { userId: true } },
          reviewRequests: { where: { status: { in: ["PENDING", "COMPLETED"] } }, select: { reviewerId: true } },
          owner: { select: { memberships: { select: { cohortId: true } } } },
        },
      },
    },
  });
  if (!ev || ev.deletedAt || !ev.storageKey) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const p = ev.project;
  const allowed = canViewProject(await toViewer(user), {
    ownerId: p.ownerId,
    visibility: p.visibility,
    deletedAt: p.deletedAt,
    collaboratorUserIds: p.collaborators.map((c) => c.userId).filter((x): x is string => Boolean(x)),
    reviewerUserIds: p.reviewRequests.map((r) => r.reviewerId),
    ownerCohortIds: p.owner.memberships.map((m) => m.cohortId),
  });
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await readUpload(ev.storageKey);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": ev.mimeType ?? "application/octet-stream",
      "Content-Disposition": `${ev.mimeType?.startsWith("image/") || ev.mimeType === "application/pdf" ? "inline" : "attachment"}; filename="${(ev.fileName ?? "file").replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
