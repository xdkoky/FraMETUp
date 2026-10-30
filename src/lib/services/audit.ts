import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function audit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId?: string | null,
  metadata?: Prisma.InputJsonValue,
) {
  await db.auditLog.create({ data: { actorId, action, targetType, targetId: targetId ?? null, metadata } });
}
