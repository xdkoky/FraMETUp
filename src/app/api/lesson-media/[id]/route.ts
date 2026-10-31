import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getViewablePhoto } from "@/lib/services/lesson-media";
import { readUpload } from "@/lib/uploads";

/** Serves a lesson picture only to users the photo policy allows. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const m = await getViewablePhoto(user, id);
  const after = new URL(req.url).searchParams.get("side") === "after";
  const key = after ? m?.afterStorageKey : m?.storageKey;
  const type = after ? m?.afterMimeType : m?.mimeType;
  if (!m || !key || !type?.startsWith("image/")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = await readUpload(key);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": "inline",
      // References are the same for everyone; examples may be private.
      "Cache-Control": m.kind === "REFERENCE" ? "private, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
