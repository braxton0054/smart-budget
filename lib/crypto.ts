import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

let cachedKey: Buffer | null = null;

// Read lazily: Next.js evaluates route modules while collecting build data,
// and runtime secrets must not be required (or baked into images) at build time.
function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const key = Buffer.from(process.env.CREDENTIALS_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  cachedKey = key;
  return key;
}

export type SealedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

/** AES-256-GCM with a fresh 96-bit IV for every value. */
export function sealSecret(plaintext: string): SealedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function openSecret(sealed: SealedSecret): string {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
