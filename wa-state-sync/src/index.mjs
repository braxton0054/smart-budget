import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import pg from "pg";

const AUTH_ROOT = "/data/baileys";
const READY_MARKER = "/tmp/restore-complete";
const POLL_MS = Number(process.env.STATE_SYNC_INTERVAL_MS ?? 10_000);
const SESSION_ID = /^[A-Za-z0-9-]{1,128}$/;
const SAFE_FILE = /^[A-Za-z0-9._-]+$/;
const MAX_FILES = 2_000;
const MAX_BYTES = 20 * 1024 * 1024;

const key = Buffer.from(process.env.CREDENTIALS_ENCRYPTION_KEY ?? "", "base64");
if (key.length !== 32) {
  throw new Error("CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function seal(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function open(sealed) {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function fingerprint(files) {
  const canonical = Object.keys(files)
    .sort()
    .map((name) => `${name}:${files[name]}`)
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

async function readSnapshot(sessionId) {
  const root = path.join(AUTH_ROOT, sessionId);
  try {
    await fs.access(root);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }

  const files = {};
  let total = 0;
  async function walk(dir, prefix) {
    const children = await fs.readdir(dir, { withFileTypes: true });
    for (const child of children) {
      if (!SAFE_FILE.test(child.name) || child.name.startsWith("corrupt-")) continue;
      const relative = prefix ? `${prefix}/${child.name}` : child.name;
      const full = path.join(dir, child.name);
      if (child.isDirectory()) {
        await walk(full, relative);
      } else if (child.isFile()) {
        if (Object.keys(files).length >= MAX_FILES) throw new Error("Too many auth files");
        const content = await fs.readFile(full);
        total += content.length;
        if (total > MAX_BYTES) throw new Error("Auth state too large");
        files[relative] = content.toString("base64");
      }
    }
  }
  await walk(root, "");
  return Object.keys(files).length ? { files, fingerprint: fingerprint(files) } : null;
}

async function latestMtime(sessionId) {
  const root = path.join(AUTH_ROOT, sessionId);
  let newest = 0;
  async function walk(dir) {
    for (const child of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, child.name);
      const stat = await fs.stat(full);
      newest = Math.max(newest, stat.mtimeMs);
      if (child.isDirectory()) await walk(full);
    }
  }
  await walk(root);
  return newest;
}

async function writeSnapshot(sessionId, snapshot) {
  const root = path.join(AUTH_ROOT, sessionId);
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  for (const [name, base64] of Object.entries(snapshot.files)) {
    if (!SAFE_FILE.test(name) || name.includes("..")) throw new Error("Unsafe auth file name");
    const full = path.join(root, name);
    await fs.mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
    await fs.writeFile(full, Buffer.from(base64, "base64"), { mode: 0o600 });
  }
}

async function restore() {
  await fs.mkdir(AUTH_ROOT, { recursive: true, mode: 0o700 });
  const { rows } = await pool.query(
    `SELECT "openwaSessionId", "stateCiphertext", "stateIv", "stateAuthTag", "stateFingerprint", "stateUpdatedAt"
       FROM "WaSession"
      WHERE "openwaSessionId" IS NOT NULL AND "stateCiphertext" IS NOT NULL`,
  );

  for (const row of rows) {
    if (!SESSION_ID.test(row.openwaSessionId)) continue;
    const existing = await readSnapshot(row.openwaSessionId);
    if (existing) {
      // Disk state normally wins: it may contain writes newer than the last
      // poll. Restore the database copy only when it is clearly newer.
      const newestWrite = await latestMtime(row.openwaSessionId);
      const storedAt = row.stateUpdatedAt ? new Date(row.stateUpdatedAt).getTime() : 0;
      if (!(storedAt > newestWrite + 2000 && existing.fingerprint !== row.stateFingerprint)) {
        continue;
      }
    }

    const snapshot = JSON.parse(
      open({
        ciphertext: row.stateCiphertext,
        iv: row.stateIv,
        authTag: row.stateAuthTag,
      }),
    );
    if (fingerprint(snapshot.files) !== row.stateFingerprint) {
      console.error("Refusing to restore tampered auth state", row.openwaSessionId);
      continue;
    }
    await writeSnapshot(row.openwaSessionId, snapshot);
    console.log("Restored encrypted WhatsApp state", row.openwaSessionId);
  }
}

async function sync() {
  const { rows } = await pool.query(
    `SELECT "openwaSessionId", "stateFingerprint" FROM "WaSession" WHERE "openwaSessionId" IS NOT NULL`,
  );
  const known = new Map(rows.filter((row) => SESSION_ID.test(row.openwaSessionId)).map((row) => [row.openwaSessionId, row]));
  if (!known.size) return;

  let dirs = [];
  try {
    dirs = await fs.readdir(AUTH_ROOT, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of dirs) {
    const sessionId = entry.name;
    if (!entry.isDirectory() || !known.has(sessionId)) continue;
    let snapshot;
    try {
      snapshot = await readSnapshot(sessionId);
    } catch (error) {
      console.error("Could not read auth state", sessionId, error.message);
      continue;
    }
    if (!snapshot || snapshot.fingerprint === known.get(sessionId).stateFingerprint) continue;

    const sealed = seal(JSON.stringify(snapshot));
    await pool.query(
      `UPDATE "WaSession"
          SET "stateCiphertext" = $1, "stateIv" = $2, "stateAuthTag" = $3,
              "stateFingerprint" = $4, "stateUpdatedAt" = NOW()
        WHERE "openwaSessionId" = $5
          AND ("stateFingerprint" IS NULL OR "stateFingerprint" <> $4)`,
      [sealed.ciphertext, sealed.iv, sealed.authTag, snapshot.fingerprint, sessionId],
    );
    console.log("Persisted encrypted WhatsApp state", sessionId);
  }
}

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    await sync();
  } catch (error) {
    console.error("WhatsApp state sync failed", error.message);
  } finally {
    running = false;
  }
}

async function main() {
  await restore();
  await fs.writeFile(READY_MARKER, "ok");
  const timer = setInterval(tick, POLL_MS);
  timer.unref?.();

  const shutdown = async () => {
    clearInterval(timer);
    await pool.end();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

await fs.rm(READY_MARKER, { force: true });
main().catch(async (error) => {
  console.error("WhatsApp state sync could not start", error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
