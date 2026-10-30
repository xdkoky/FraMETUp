import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "evidence";

const ALLOWED: Record<string, { ext: string; magic?: number[] }> = {
  "application/pdf": { ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  "text/plain": { ext: "txt" },
  "text/markdown": { ext: "md" },
};

export const ALLOWED_UPLOAD_TYPES = Object.keys(ALLOWED);

// ── Storage drivers ──
// Local disk for development; a private Supabase Storage bucket in production
// (serverless hosts like Vercel have no persistent disk). Files are only ever
// served through the authorised /api/files route, never by public URL.

interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

const localDriver: StorageDriver = {
  async put(key, data) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, key), data, { mode: 0o600 });
  },
  get: (key) => readFile(path.join(UPLOAD_DIR, key)),
  async remove(key) {
    await unlink(path.join(UPLOAD_DIR, key)).catch(() => {});
  },
};

let supabase: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;

function supabaseDriver(url: string, serviceKey: string): StorageDriver {
  supabase ??= createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const client = supabase;
  const ensureBucket = () =>
    (bucketReady ??= (async () => {
      const { data } = await client.storage.getBucket(BUCKET);
      if (data) {
        if (data.public) throw new Error(`Supabase bucket "${BUCKET}" is public; make it private before storing student work.`);
        return;
      }
      const { error } = await client.storage.createBucket(BUCKET, { public: false, fileSizeLimit: UPLOAD_MAX_BYTES });
      if (error && !/already exists/i.test(error.message)) throw new Error(`Could not create storage bucket: ${error.message}`);
    })().catch((e) => {
      bucketReady = null;
      throw e;
    }));
  return {
    async put(key, data, contentType) {
      await ensureBucket();
      const { error } = await client.storage.from(BUCKET).upload(key, data, { contentType, upsert: false });
      if (error) throw new Error(`Upload failed: ${error.message}`);
    },
    async get(key) {
      const { data, error } = await client.storage.from(BUCKET).download(key);
      if (error || !data) throw new Error(`File not found in storage`);
      return Buffer.from(await data.arrayBuffer());
    },
    async remove(key) {
      await client.storage.from(BUCKET).remove([key]);
    },
  };
}

function driver(): StorageDriver {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? supabaseDriver(url, key) : localDriver;
}

function checkKey(storageKey: string) {
  if (!/^[a-f0-9]{36}\.[a-z]{2,4}$/.test(storageKey)) throw new Error("Invalid storage key");
  return storageKey;
}

/** Validates size, declared type and magic bytes, then stores under a random key. */
export async function storeUpload(file: File): Promise<{ storageKey: string; mimeType: string; sizeBytes: number; fileName: string }> {
  if (file.size === 0) throw new Error("The file is empty.");
  if (file.size > UPLOAD_MAX_BYTES) throw new Error(`Files must be under ${Math.round(UPLOAD_MAX_BYTES / 1024 / 1024)} MB.`);
  const rule = ALLOWED[file.type];
  if (!rule) throw new Error("Only PDF, PNG, JPEG, plain text and Markdown files are allowed. Use a link for video.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (rule.magic && !rule.magic.every((b, i) => buf[i] === b)) throw new Error("The file contents don't match its type.");
  if (!rule.magic && buf.includes(0)) throw new Error("Text files must not contain binary data.");
  const storageKey = `${randomBytes(18).toString("hex")}.${rule.ext}`;
  await driver().put(storageKey, buf, file.type);
  const fileName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || `upload.${rule.ext}`;
  return { storageKey, mimeType: file.type, sizeBytes: file.size, fileName };
}

export function readUpload(storageKey: string) {
  return driver().get(checkKey(storageKey));
}

export async function deleteUpload(storageKey: string) {
  await driver().remove(checkKey(storageKey));
}
