import "server-only";
import { db } from "@/lib/db";
import { parseEmailList, staffRolesFor } from "@/lib/auth/staff-emails";
import { audit } from "./audit";

/**
 * Adds any ADMIN/INSTRUCTOR role configured for this email that the user doesn't have yet.
 * When ADMIN_EMAILS is set it is the only source of admins, so a stored ADMIN role for anyone
 * else is removed (it is already ignored at request time — see effectiveRoles).
 */
export async function syncStaffRoles(userId: string, email: string) {
  const admins = parseEmailList(process.env.ADMIN_EMAILS);
  if (admins.size > 0 && !admins.has(email.trim().toLowerCase())) {
    const removed = await db.userRole.deleteMany({ where: { userId, role: { key: "ADMIN" } } });
    if (removed.count) await audit(userId, "role.admin_revoked_by_config", "User", userId);
  }
  const wanted = staffRolesFor(email, { ADMIN_EMAILS: process.env.ADMIN_EMAILS, INSTRUCTOR_EMAILS: process.env.INSTRUCTOR_EMAILS });
  for (const key of wanted) {
    const role = await db.role.findUnique({ where: { key } });
    if (!role) continue;
    const has = await db.userRole.findFirst({ where: { userId, roleId: role.id, cohortId: null } });
    if (has) continue;
    await db.userRole.create({ data: { userId, roleId: role.id, verified: true } });
    await audit(userId, "role.granted_from_config", "User", userId, { role: key });
  }
}
