"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { calibrateFromMeasurement } from "@/lib/production/optics";

export type VfState = { error?: string; ok?: string } | null;

/** Parses "name; width; height" lines into sensor modes. */
function parseModes(text: string) {
  const modes: { key: string; name: string; widthMm: number; heightMm: number; category: "Custom" }[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    if (!line.trim()) continue;
    const parts = line.split(/[;|]/).map((p) => p.trim());
    const [name, w, h] = parts.length >= 3 ? parts : [`Mode ${i + 1}`, ...line.split(/[x×\s,]+/).map((p) => p.trim())];
    const widthMm = Number(String(w).replace(",", "."));
    const heightMm = Number(String(h).replace(",", "."));
    if (!(widthMm > 3 && widthMm < 80 && heightMm > 2 && heightMm < 60)) throw new Error(`Line ${i + 1}: enter width and height in millimetres, e.g. "Open Gate; 28.25; 18.17".`);
    modes.push({ key: `m${i}`, name: name.slice(0, 60) || `Mode ${i + 1}`, widthMm, heightMm, category: "Custom" });
  }
  if (!modes.length) throw new Error("Add at least one sensor mode.");
  return modes.slice(0, 12);
}

export async function createCameraProfile(_: VfState, fd: FormData): Promise<VfState> {
  const user = await requireUser();
  const manufacturer = String(fd.get("manufacturer") ?? "").trim().slice(0, 60);
  const model = String(fd.get("model") ?? "").trim().slice(0, 80);
  if (!manufacturer || !model) return { error: "Enter the manufacturer and model." };
  let modes;
  try {
    modes = parseModes(String(fd.get("modes") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Check the sensor modes." };
  }
  const shared = fd.get("shared") === "on" && (user.roles.includes("INSTRUCTOR") || user.roles.includes("ADMIN"));
  await db.cameraProfile.create({ data: { createdById: user.id, manufacturer, model, modes, shared } });
  revalidatePath("/viewfinder");
  revalidatePath("/viewfinder/cameras");
  return { ok: "Camera profile saved." };
}

export async function deleteCameraProfile(id: string) {
  const user = await requireUser();
  await db.cameraProfile.deleteMany({ where: { id, ...(user.roles.includes("ADMIN") ? {} : { createdById: user.id }) } });
  revalidatePath("/viewfinder/cameras");
}

/** Saves how wide one of the user's phone cameras sees (long side of the preview). */
export async function saveCalibration(_: VfState, fd: FormData): Promise<VfState & { fov?: number }> {
  const user = await requireUser();
  const label = String(fd.get("label") ?? "").trim().slice(0, 80) || "Main camera";
  let fov: number;
  const method = String(fd.get("method") ?? "measure");
  try {
    if (method === "direct") {
      fov = Number(String(fd.get("fov") ?? "").replace(",", "."));
    } else {
      fov = calibrateFromMeasurement(Number(String(fd.get("width") ?? "").replace(",", ".")), Number(String(fd.get("distance") ?? "").replace(",", ".")) * 10);
    }
  } catch {
    return { error: "Enter the object width (mm) and the distance (cm)." };
  }
  if (!(fov > 20 && fov < 130)) return { error: "That gives an unusual field of view. Measure again: the object must exactly fill the long side of the preview." };
  await db.phoneCalibration.upsert({ where: { userId_label: { userId: user.id, label } }, create: { userId: user.id, label, longSideFovDeg: fov, method }, update: { longSideFovDeg: fov, method } });
  revalidatePath("/viewfinder");
  return { ok: `Calibrated: ${fov.toFixed(1)}° across the long side.`, fov };
}

export async function deleteCalibration(id: string) {
  const user = await requireUser();
  await db.phoneCalibration.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/viewfinder");
}
