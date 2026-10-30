import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");

const ALLOWED: Record<string, { ext: string; magic?: number[] }> = {
  "application/pdf": { ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "text/plain": { ext: "txt" },
  "text/markdown": { ext: "md" },
};

export const ALLOWED_UPLOAD_TYPES = Object.keys(ALLOWED);

/** Validates size, declared type and magic bytes; stores outside the web root under a random key. */
export async function storeUpload(file: File): Promise<{ storageKey: string; mimeType: string; sizeBytes: number; fileName: string }> {
  if (file.size === 0) throw new Error("The file is empty.");
  if (file.size > UPLOAD_MAX_BYTES) throw new Error(`Files must be under ${Math.round(UPLOAD_MAX_BYTES / 1024 / 1024)} MB.`);
  const rule = ALLOWED[file.type];
  if (!rule) throw new Error("Only PDF, PNG, JPEG, plain text and Markdown files are allowed. Use a link for video.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (rule.magic && !rule.magic.every((b, i) => buf[i] === b)) throw new Error("The file contents don't match its type.");
  if (!rule.magic && buf.includes(0)) throw new Error("Text files must not contain binary data.");
  const storageKey = `${randomBytes(18).toString("hex")}.${rule.ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, storageKey), buf, { mode: 0o600 });
  const fileName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || `upload.${rule.ext}`;
  return { storageKey, mimeType: file.type, sizeBytes: file.size, fileName };
}

function safePath(storageKey: string) {
  if (!/^[a-f0-9]{36}\.[a-z]{2,4}$/.test(storageKey)) throw new Error("Invalid storage key");
  return path.join(UPLOAD_DIR, storageKey);
}

export function readUpload(storageKey: string) {
  return readFile(safePath(storageKey));
}

export async function deleteUpload(storageKey: string) {
  await unlink(safePath(storageKey)).catch(() => {});
}
