/**
 * Staff roles granted from configuration, so a deployment owner can make themselves or
 * their teachers admins/instructors without database access. Set comma-separated emails in
 * ADMIN_EMAILS and INSTRUCTOR_EMAILS; the role is added the next time that account signs in.
 * Roles are only ever added here — remove one through the database if needed.
 */
export function parseEmailList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

export function staffRolesFor(email: string, env: { ADMIN_EMAILS?: string; INSTRUCTOR_EMAILS?: string }): ("ADMIN" | "INSTRUCTOR")[] {
  const e = email.trim().toLowerCase();
  const roles: ("ADMIN" | "INSTRUCTOR")[] = [];
  if (parseEmailList(env.ADMIN_EMAILS).has(e)) roles.push("ADMIN");
  if (parseEmailList(env.INSTRUCTOR_EMAILS).has(e)) roles.push("INSTRUCTOR");
  return roles;
}
