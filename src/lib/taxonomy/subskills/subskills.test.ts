import { describe, expect, it } from "vitest";
import { SKILLS } from "../index";
import { SUBSKILLS } from "./index";

describe("sub-skills", () => {
  it("gives every skill three practisable sub-skills", () => {
    for (const skill of SKILLS) {
      const list = SUBSKILLS[skill.id];
      expect(list, skill.id).toBeDefined();
      expect(list).toHaveLength(3);
    }
  });

  it("only references real skills", () => {
    const ids = new Set(SKILLS.map((s) => s.id));
    for (const key of Object.keys(SUBSKILLS)) expect(ids.has(key), key).toBe(true);
  });

  it("has unique ids and complete bilingual text", () => {
    const all = Object.values(SUBSKILLS).flat();
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
    for (const s of all) {
      expect(s.minutes).toBeGreaterThan(0);
      for (const loc of [s.en, s.hu]) {
        expect(loc.name.trim(), s.id).not.toBe("");
        expect(loc.what.trim(), s.id).not.toBe("");
        expect(loc.drill.trim(), s.id).not.toBe("");
      }
    }
  });
});
