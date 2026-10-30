import { createHash, randomBytes } from "node:crypto";

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

/** Only the hash is stored, so a database leak does not leak usable sessions. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
