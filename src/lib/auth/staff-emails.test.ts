import { describe, expect, it } from "vitest";
import { parseEmailList, staffRolesFor } from "./staff-emails";

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
