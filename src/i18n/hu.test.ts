import { describe, expect, it } from "vitest";
import { extractKeys } from "./extract";
import { HU } from "./hu";

describe("Hungarian dictionary", () => {
  it("translates every UI string", () => {
    const missing = [...extractKeys()].filter((k) => !(k in HU));
    expect(missing).toEqual([]);
  });

  it("keeps every {placeholder} in translations", () => {
    for (const [en, hu] of Object.entries(HU)) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
      expect(ph(hu), en).toBe(ph(en));
    }
  });
});
