import "server-only";
import { db } from "@/lib/db";
import { staffRolesFor } from "@/lib/auth/staff-emails";
import { audit } from "./audit";

/** Adds any ADMIN/INSTRUCTOR role configured for this email that the user doesn't have yet. */
export async function syncStaffRoles(userId: string, email: string) {
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
