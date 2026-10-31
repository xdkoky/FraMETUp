import { z } from "zod";
import { roleInfo, type Department } from "./roles";

const time = z.string().trim().max(10).regex(/^$|^\d{1,2}[:.]\d{2}$/, "Use HH:MM.").default("");
const text = (n: number) => z.string().trim().max(n).default("");

export const CallSheetData = z.object({
  date: z.string().trim().max(20).default(""),
  location: text(160),
  address: text(240),
  generalCall: time,
  parking: text(600),
  meals: text(400),
  weather: text(160),
  emergencyContact: text(200),
  nearestHospital: text(240),
  safety: text(1200),
  notes: text(1500),
  equipment: text(1500),
  departments: z.record(z.string(), text(800)).default({}),
  memberCalls: z.record(z.string(), time).default({}),
  schedule: z
    .array(z.object({ time, label: text(160), sceneId: z.string().max(40).optional().default(""), minutes: z.coerce.number().int().min(0).max(600).default(0) }))
    .max(60)
    .default([]),
});
export type CallSheetData = z.infer<typeof CallSheetData>;

export const EMPTY_CALL_SHEET: CallSheetData = CallSheetData.parse({});

const LABELS: Partial<Record<keyof CallSheetData, string>> = {
  date: "Date",
  location: "Location",
  address: "Address",
  generalCall: "General call",
  parking: "Parking & arrival",
  meals: "Meals",
  weather: "Weather",
  emergencyContact: "Emergency contact",
  nearestHospital: "Nearest hospital",
  safety: "Safety",
  notes: "Notes",
  equipment: "Equipment",
};

/** Human summary of what changed between two versions — shown on publish and in notifications. */
export function diffCallSheets(prev: CallSheetData | null, next: CallSheetData, memberNames: Record<string, string> = {}): { changes: string[]; important: boolean } {
  if (!prev) return { changes: ["First version published"], important: true };
  const changes: string[] = [];
  let important = false;
  for (const k of Object.keys(LABELS) as (keyof CallSheetData)[]) {
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) {
      changes.push(`${LABELS[k]} changed`);
      if (["date", "location", "address", "generalCall", "safety"].includes(k)) important = true;
    }
  }
  const ids = new Set([...Object.keys(prev.memberCalls), ...Object.keys(next.memberCalls)]);
  for (const id of ids) {
    if ((prev.memberCalls[id] ?? "") !== (next.memberCalls[id] ?? "")) {
      changes.push(`Call time changed for ${memberNames[id] ?? "a crew member"}`);
      important = true;
    }
  }
  if (JSON.stringify(prev.schedule) !== JSON.stringify(next.schedule)) changes.push("Scene schedule changed");
  if (JSON.stringify(prev.departments) !== JSON.stringify(next.departments)) changes.push("Department notes changed");
  return { changes: changes.length ? changes : ["Minor edits"], important };
}

/** The departments a member should see first on their personal call sheet. */
export function departmentsFor(roles: string[], isActor: boolean): Department[] {
  const set = new Set<Department>(roles.map((r) => roleInfo(r).department));
  if (isActor) set.add("cast");
  return [...set];
}

/** A member's own call time, falling back to general call. */
export function callTimeFor(data: CallSheetData, memberId: string) {
  return data.memberCalls[memberId] || data.generalCall || "";
}
