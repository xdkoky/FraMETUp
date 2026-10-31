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

/**
 * When ADMIN_EMAILS is configured it is the complete list of administrators: an ADMIN role
 * held by anyone else (old seed data, a demo admin, a manual grant) is ignored.
 */
export function effectiveRoles<R extends string>(email: string, roles: R[], env: { ADMIN_EMAILS?: string }): R[] {
  const admins = parseEmailList(env.ADMIN_EMAILS);
  if (admins.size === 0) return roles;
  const isAdmin = admins.has(email.trim().toLowerCase());
  return roles.filter((r) => r !== "ADMIN" || isAdmin);
}
