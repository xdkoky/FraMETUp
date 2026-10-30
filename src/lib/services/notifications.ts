import "server-only";
import { db } from "@/lib/db";

export function notify(userId: string, kind: string, title: string, body?: string, href?: string) {
  return db.notification.create({ data: { userId, kind, title, body, href } });
}
