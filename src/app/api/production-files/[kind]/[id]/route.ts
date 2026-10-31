import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { loadAccess } from "@/lib/services/production";
import { readUpload } from "@/lib/uploads";

/** Serves production files (reference frames, take photos, documents) to crew who may see them. */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { kind, id } = await params;
  let file: { productionId: string; key: string; mime: string; name?: string } | null = null;
  if (kind === "reference") {
    const r = await db.shotReference.findUnique({ where: { id } });
    if (r) file = { productionId: r.productionId, key: r.storageKey, mime: r.mimeType };
  } else if (kind === "take") {
    const t = await db.takeLog.findUnique({ where: { id } });
    if (t?.photoKey && t.photoMime) file = { productionId: t.productionId, key: t.photoKey, mime: t.photoMime };
  } else if (kind === "document") {
    const v = await db.productionDocumentVersion.findUnique({ where: { id }, include: { document: true } });
    if (v && !v.document.deletedAt) file = { productionId: v.document.productionId, key: v.storageKey, mime: v.mimeType, name: v.fileName };
  }
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await loadAccess(user, file.productionId);
  if (!r?.access.view || r.access.limited) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await readUpload(file.key);
  const inline = file.mime.startsWith("image/") || file.mime === "application/pdf";
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${inline && !download ? "inline" : "attachment"}; filename="${(file.name ?? `${kind}-${id}`).replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
