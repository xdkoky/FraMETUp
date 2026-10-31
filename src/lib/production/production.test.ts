import { describe, expect, it } from "vitest";
import { calibrateFromMeasurement, computeFraming, cropFactor, fov, frameWithin, fullFrameEquivalent, parseAspect, sensorFov, streamFov, UNCALIBRATED_LONG_SIDE_FOV } from "./optics";
import { BUNDLED_CAMERAS, findMode } from "./cameras";
import { productionAccess, type MemberFacts } from "./permissions";
import { countExperience, suggestCrew } from "./rotation";
import { scheduleProgress } from "./schedule";
import { CallSheetData, callTimeFor, diffCallSheets, EMPTY_CALL_SHEET } from "./callsheet";
import { prepChecklist, prepProgress } from "./lifecycle";
import { reflectionQuestions, ROLE_SKILLS } from "./roles";
import { SKILLS } from "@/lib/taxonomy";

const close = (a: number, b: number, d = 0.01) => expect(Math.abs(a - b)).toBeLessThan(d);

describe("field of view", () => {
  it("matches the rectilinear formula on known examples", () => {
    close(fov(36, 50), 39.5978); // full frame, 50 mm, horizontal
    close(fov(24, 50), 26.9915); // full frame, 50 mm, vertical
    close(fov(36, 18), 90); // 2·atan(1)
    close(fov(23.76, 35), 37.4974); // ALEXA Mini 2.8K 16:9, 35 mm
    const f = sensorFov({ widthMm: 36, heightMm: 24 }, 50);
    close(f.d, 46.7930);
  });

  it("does not treat focal length as field of view across formats", () => {
    const s35 = { widthMm: 23.76, heightMm: 13.37 };
    expect(fov(s35.widthMm, 35)).toBeLessThan(fov(36, 35));
    close(fullFrameEquivalent(s35, 35), 53.03);
    close(cropFactor(s35), 1.5870, 0.001);
  });

  it("applies recording crops and aspect frames inside the active area", () => {
    const og = { widthMm: 28.25, heightMm: 18.17 };
    const scope = frameWithin(og, 2.39);
    close(scope.widthMm, 28.25);
    close(scope.heightMm, 11.82);
    const academy = frameWithin(og, 4 / 3);
    close(academy.heightMm, 18.17);
    close(academy.widthMm, 24.2267);
    expect(frameWithin(og, null)).toEqual(og);
    close(parseAspect("2.39:1")!, 2.39);
    close(parseAspect("16:9")!, 1.7778);
    expect(parseAspect("abc")).toBeNull();
  });
});

describe("phone calibration and framing", () => {
  it("derives the phone FOV from a measured object", () => {
    close(calibrateFromMeasurement(297, 300), 52.6708);
    expect(() => calibrateFromMeasurement(0, 300)).toThrow();
  });

  it("converts long-side FOV to the stream's width in portrait and landscape", () => {
    close(streamFov(70, 1920, 1080).h, 70);
    const portrait = streamFov(70, 1080, 1920);
    close(portrait.v, 70);
    expect(portrait.h).toBeLessThan(70);
  });

  it("assumes a typical 26 mm-equivalent phone when uncalibrated", () => {
    close(UNCALIBRATED_LONG_SIDE_FOV, 67.3, 0.2);
  });

  it("crops in for narrower lenses and reports lenses wider than the phone", () => {
    const tele = computeFraming({ phoneLongSideFovDeg: 70, streamWidth: 1920, streamHeight: 1080, frame: { widthMm: 36, heightMm: 24 }, focalMm: 50 });
    close(tele.scale, Math.tan((35 * Math.PI) / 180) / 0.36, 0.001);
    expect(tele.fitsH).toBe(true);
    expect(tele.effectivePixels).toBe(Math.round(1920 / tele.scale));
    const wide = computeFraming({ phoneLongSideFovDeg: 70, streamWidth: 1920, streamHeight: 1080, frame: { widthMm: 36, heightMm: 24 }, focalMm: 18 });
    expect(wide.fitsH).toBe(false);
    expect(wide.targetH).toBeGreaterThan(wide.phoneH);
  });
});

describe("camera profiles", () => {
  it("bundles only complete, sourced modes", () => {
    for (const c of BUNDLED_CAMERAS) {
      expect(c.modes.length, c.id).toBeGreaterThan(0);
      for (const m of c.modes) {
        expect(m.widthMm > 10 && m.widthMm < 60 && m.heightMm > 5 && m.heightMm < 40, `${c.id}/${m.key}`).toBe(true);
        expect(m.widthMm).toBeGreaterThan(m.heightMm);
      }
      if (c.manufacturer !== "Reference") expect(c.source, c.id).toMatch(/^https:\/\//);
    }
    expect(findMode(BUNDLED_CAMERAS, "arri-alexa-mini", "2.8k-169")?.mode.widthMm).toBe(23.76);
    expect(findMode(BUNDLED_CAMERAS, "arri-alexa-mini", "nope")?.mode.key).toBe("3.4k-og");
  });
});

describe("production permissions", () => {
  const m = (id: string, userId: string, roles: string[], extra: Partial<MemberFacts> = {}): MemberFacts => ({ id, userId, roles, isManager: false, isActor: false, status: "ACCEPTED", ...extra });
  const facts = {
    createdById: "creator",
    deletedAt: null,
    members: [m("1", "dir", ["director"]), m("2", "dop", ["dop"]), m("3", "boom", ["boom_operator"]), m("4", "actor", ["actor"], { isActor: true }), m("5", "inv", ["grip"], { status: "INVITED" })],
  };
  const v = (id: string, roles = ["STUDENT"]) => ({ id, roles });

  it("gives the creator and director management, the DoP creative edit", () => {
    expect(productionAccess(v("creator"), facts).manage).toBe(true);
    expect(productionAccess(v("dir"), facts).manage).toBe(true);
    const dop = productionAccess(v("dop"), facts);
    expect(dop.manage).toBe(false);
    expect(dop.editCreative && dop.liveUpdate).toBe(true);
    expect(dop.readyDepartments).toEqual(["camera"]);
  });

  it("limits actors and keeps contacts from them", () => {
    const a = productionAccess(v("actor"), facts);
    expect(a.view && a.limited).toBe(true);
    expect(a.seeContacts || a.editCreative || a.manage).toBe(false);
  });

  it("does not let invitations or outsiders see the production", () => {
    expect(productionAccess(v("inv"), facts).view).toBe(false);
    expect(productionAccess(v("stranger"), facts).view).toBe(false);
    expect(productionAccess(v("teacher", ["INSTRUCTOR"]), facts)).toMatchObject({ view: true, manage: false, staffView: true });
  });

  it("scopes roles to one production", () => {
    const other = { createdById: "x", deletedAt: null, members: [m("9", "dir", ["boom_operator"])] };
    expect(productionAccess(v("dir"), other).manage).toBe(false);
    expect(productionAccess(v("boom"), facts).liveUpdate).toBe(false);
    expect(productionAccess(v("dir"), { ...facts, deletedAt: new Date() }).view).toBe(false);
  });
});

describe("crew rotation", () => {
  it("counts experience and suggests untried roles with reasons", () => {
    expect(countExperience([{ roles: ["director"] }, { roles: ["director", "first_ad"] }])).toEqual({ director: 2, first_ad: 1 });
    const s = suggestCrew(["director", "sound_mixer"], [
      { memberId: "a", name: "Anna", experience: { director: 3 } },
      { memberId: "b", name: "Bence", experience: { sound_mixer: 1 } },
    ]);
    expect(s.find((x) => x.role === "director")?.memberId).toBe("b");
    expect(s.find((x) => x.role === "director")?.reasons).toContain("has not tried this role yet");
    expect(new Set(s.map((x) => x.memberId)).size).toBe(s.length);
  });
});

describe("schedule progress", () => {
  it("compares actual with planned time on completed setups", () => {
    const t = (min: number) => new Date(Date.UTC(2026, 0, 1, 9, min));
    const p = scheduleProgress(
      [
        { status: "COMPLETED", setupMinutes: 20, prepStartedAt: t(0), completedAt: t(30) },
        { status: "COMPLETED", setupMinutes: 20, prepStartedAt: t(30), completedAt: t(50) },
        { status: "PLANNED", setupMinutes: 40, prepStartedAt: null, completedAt: null },
        { status: "SKIPPED", setupMinutes: 10, prepStartedAt: null, completedAt: null },
      ],
      t(50),
    );
    expect(p).toMatchObject({ total: 3, completed: 2, skipped: 1, remaining: 1, deviationMinutes: 10, remainingPlannedMinutes: 40, projectedRemainingMinutes: 50 });
  });
});

describe("call sheets", () => {
  it("validates times and summarises important changes", () => {
    expect(() => CallSheetData.parse({ generalCall: "nine" })).toThrow();
    const a = CallSheetData.parse({ generalCall: "08:00", memberCalls: { m1: "07:30" } });
    const b = CallSheetData.parse({ generalCall: "09:00", memberCalls: { m1: "08:00" }, notes: "Bring layers" });
    const d = diffCallSheets(a, b, { m1: "Dóra" });
    expect(d.important).toBe(true);
    expect(d.changes).toEqual(expect.arrayContaining(["General call changed", "Notes changed", "Call time changed for Dóra"]));
    expect(diffCallSheets(a, a).important).toBe(false);
    expect(callTimeFor(b, "m1")).toBe("08:00");
    expect(callTimeFor(b, "m2")).toBe("09:00");
    expect(EMPTY_CALL_SHEET.schedule).toEqual([]);
  });
});

describe("prep checklist, reflection and skill mapping", () => {
  it("tracks preparation progress", () => {
    const items = prepChecklist({ hasDirector: true, hasDop: false, crewCount: 4, sceneCount: 2, shotCount: 4, shotsWithFocal: 4, briefsFilled: 1, callSheetPublished: false, openTasks: 0, hasShootDate: true }, "/p");
    expect(items.filter((i) => i.done).map((i) => i.key)).toEqual(["date", "director", "crew", "scenes", "shots", "tasks"]);
    close(prepProgress(items), 6 / 9);
  });

  it("adapts reflection questions to the role and maps roles to real skills", () => {
    expect(reflectionQuestions(["director"])[0]).toMatch(/vision/);
    expect(reflectionQuestions(["dop"])[0]).toMatch(/director's vision/);
    const ids = new Set(SKILLS.map((s) => s.id));
    for (const [role, skills] of Object.entries(ROLE_SKILLS)) for (const s of skills) expect(ids.has(s), `${role} → ${s}`).toBe(true);
  });
});
