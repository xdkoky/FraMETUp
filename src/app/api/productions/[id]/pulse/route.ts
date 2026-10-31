import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { latestChangeAt, loadAccess } from "@/lib/services/production";

/** Tiny "did anything change?" check that open Live Set screens poll every few seconds. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await loadAccess(user, id);
  if (!r?.access.view) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const at = await latestChangeAt(id);
  return NextResponse.json({ changedAt: at?.toISOString() ?? null }, { headers: { "Cache-Control": "no-store" } });
}
