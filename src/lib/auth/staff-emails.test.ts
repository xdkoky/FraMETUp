import { describe, expect, it } from "vitest";
import { effectiveRoles, parseEmailList, staffRolesFor } from "./staff-emails";

describe("staff roles from configuration", () => {
  it("parses comma, semicolon and space separated lists case-insensitively", () => {
    expect([...parseEmailList(" A@x.hu, b@y.com;c@z.org  junk ")]).toEqual(["a@x.hu", "b@y.com", "c@z.org"]);
    expect(parseEmailList(undefined).size).toBe(0);
  });

  it("grants only the roles an email is listed for", () => {
    const env = { ADMIN_EMAILS: "owner@x.hu", INSTRUCTOR_EMAILS: "teacher@metu.edu.tr, owner@x.hu" };
    expect(staffRolesFor("Owner@X.hu", env)).toEqual(["ADMIN", "INSTRUCTOR"]);
    expect(staffRolesFor("teacher@metu.edu.tr", env)).toEqual(["INSTRUCTOR"]);
    expect(staffRolesFor("student@x.hu", env)).toEqual([]);
  });
});

describe("exclusive admin list", () => {
  it("drops ADMIN from anyone not listed once ADMIN_EMAILS is set", () => {
    const env = { ADMIN_EMAILS: "owner@x.hu" };
    expect(effectiveRoles("owner@x.hu", ["STUDENT", "ADMIN"], env)).toEqual(["STUDENT", "ADMIN"]);
    expect(effectiveRoles("admin@frametup.local", ["STUDENT", "ADMIN"], env)).toEqual(["STUDENT"]);
    expect(effectiveRoles("teacher@x.hu", ["INSTRUCTOR"], env)).toEqual(["INSTRUCTOR"]);
  });

  it("leaves roles alone when no admin list is configured", () => {
    expect(effectiveRoles("a@x.hu", ["ADMIN"], {})).toEqual(["ADMIN"]);
  });
});
