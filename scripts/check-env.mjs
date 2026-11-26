#!/usr/bin/env node
/**
 * Credential health check. Reads .env locally and verifies providers with the
 * smallest possible API calls. Secrets are never printed.
 *
 *   npm run env:check
 */
import fs from "node:fs";
import path from "node:path";

const results = [];
const envPath = path.join(process.cwd(), ".env");
const secretKeys = [
  "POSTGRES_PASSWORD",
  "DATABASE_URL",
  "SESSION_SECRET",
  "CREDENTIALS_ENCRYPTION_KEY",
  "ZAI_API_KEY",
  "OPENCODE_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "OPENWA_API_KEY",
  "OPENWA_ADMIN_API_KEY",
  "OPENWA_WEBHOOK_SECRET",
  "OPENWA_API_KEY_PEPPER",
];
const requiredKeys = [
  "APP_URL",
  "POSTGRES_PASSWORD",
  "DATABASE_URL",
  "REDIS_URL",
  "SESSION_SECRET",
  "CREDENTIALS_ENCRYPTION_KEY",
  "ZAI_API_KEY",
  "ZAI_BASE_URL",
  "ZAI_MODEL",
  "OPENCODE_API_KEY",
  "OPENCODE_BASE_URL",
  "OPENCODE_MODEL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "OPENWA_URL",
  "OPENWA_ADMIN_API_KEY",
];
const placeholder = /CHANGE_ME|REPLACE|YOUR_|PLACEHOLDER/i;

function record(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`${status.padEnd(4)}  ${name.padEnd(20)} ${detail}`);
}

function parseEnv() {
  if (!fs.existsSync(envPath)) {
    record("ENV_FILE", "FAIL", ".env not found");
    return { values: {}, malformed: [], duplicates: [] };
  }

  const values = {};
  const malformed = [];
  const duplicates = [];

  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = line.indexOf("=");
    if (separator < 0) {
      malformed.push(index + 1);
      return;
    }
    const key = line.slice(0, separator).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      malformed.push(index + 1);
      return;
    }
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key in values) {
      if (!duplicates.includes(key)) duplicates.push(key);
    } else {
      values[key] = value;
    }
  });

  return { values, malformed, duplicates };
}

const parsed = parseEnv();
const env = { ...process.env, ...parsed.values };
const value = (key, fallback = "") => env[key] ?? fallback;
const secretValues = secretKeys.map((key) => value(key)).filter((secret) => secret && secret.length >= 6);

function redact(input) {
  let output = String(input);
  for (const secret of secretValues) output = output.split(secret).join("[REDACTED]");
  return output
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-[REDACTED]")
    .replace(/oc_sk_[A-Za-z0-9_-]{8,}/g, "oc_sk-[REDACTED]")
    .replace(/re_[A-Za-z0-9_-]{8,}/g, "re_[REDACTED]");
}

async function call(url, init = {}, timeout = 20_000) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { ok: response.ok, status: response.status, text: redact(text), body, error: "" };
  } catch (error) {
    return { ok: false, status: 0, text: "", body: null, error: redact(error.message) };
  }
}

function errorCode(result) {
  const { body } = result;
  if (body && typeof body === "object") {
    const root = body;
    const nestedError = root.error;
    if (nestedError && typeof nestedError === "object") {
      return String(nestedError.code ?? nestedError.type ?? nestedError.message ?? "unknown_error");
    }
    return String(root.error ?? root.message ?? "unknown_error");
  }
  return result.text.slice(0, 120) || "unknown_error";
}

function modelIds(result) {
  const { body } = result;
  if (!body || typeof body !== "object") return [];
  const list = Array.isArray(body.data) ? body.data : Array.isArray(body.models) ? body.models : [];
  return list
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return String(item.id ?? item.name ?? "");
      return "";
    })
    .filter(Boolean);
}

function checkStructure() {
  const problems = [];
  if (parsed.malformed.length) problems.push(`invalid lines: ${parsed.malformed.join(",")}`);
  if (parsed.duplicates.length) problems.push(`duplicate keys: ${parsed.duplicates.join(",")}`);
  for (const key of requiredKeys) {
    const current = value(key);
    if (!current) problems.push(`missing ${key}`);
    else if (placeholder.test(current) && key !== "EMAIL_FROM") problems.push(`placeholder ${key}`);
  }

  const encryptionKey = Buffer.from(value("CREDENTIALS_ENCRYPTION_KEY"), "base64");
  if (encryptionKey.length !== 32) problems.push("CREDENTIALS_ENCRYPTION_KEY is not 32 bytes");
  if (value("SESSION_SECRET").length < 32) problems.push("SESSION_SECRET is too short");
  for (const key of ["DATABASE_URL", "REDIS_URL", "OPENWA_URL"]) {
    try {
      new URL(value(key));
    } catch {
      problems.push(`${key} is not a URL`);
    }
  }

  record(
    "ENV_STRUCTURE",
    problems.length ? "FAIL" : "PASS",
    problems.length ? problems.join("; ") : "syntax and required keys valid",
  );
}

async function checkOpenAiCompatible(label, config) {
  if (!config.key) {
    record(label, "FAIL", "API key missing");
    return;
  }

  const base = config.base.replace(/\/$/, "");
  const models = await call(`${base}/models`, { headers: { Authorization: `Bearer ${config.key}` } });
  if (!models.ok) {
    record(
      label,
      models.status === 401 || models.status === 403 ? "FAIL" : "WARN",
      `authentication check failed: ${models.error || errorCode(models)}`,
    );
    return;
  }
  record(`${label}_KEY`, "PASS", `authenticated (${modelIds(models).length} models)`);

  const ids = modelIds(models);
  const candidates = [
    { role: "PRIMARY", name: config.model },
    ...(config.fallbacks ?? []).map((name, index) => ({ role: `FALLBACK${index + 1}`, name })),
  ].filter((candidate) => candidate.name);

  for (const candidate of candidates) {
    const listed = !ids.length || ids.includes(candidate.name);
    record(
      `${label}_${candidate.role}_LIST`,
      listed ? "PASS" : "WARN",
      listed ? `${candidate.name} is listed` : `${candidate.name} is not listed; testing directly`,
    );

    const chat = await call(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: candidate.name,
        messages: [{ role: "user", content: "Reply with OK" }],
        max_tokens: 16,
      }),
    });
    const chatLabel = `${label}_${candidate.role}_CHAT`;
    if (chat.ok) {
      record(chatLabel, "PASS", "small completion succeeded");
    } else if (chat.status === 402 || chat.status === 429) {
      record(chatLabel, "WARN", `key valid but usage blocked: ${errorCode(chat)}`);
    } else if (chat.status === 400 || chat.status === 404) {
      record(chatLabel, "FAIL", `model unavailable: ${errorCode(chat)}`);
    } else {
      record(chatLabel, "FAIL", `HTTP ${chat.status}: ${errorCode(chat)}`);
    }
  }
}

async function checkGoogle() {
  const clientId = value("GOOGLE_CLIENT_ID");
  const clientSecret = value("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    record("GOOGLE_OAUTH", "FAIL", "client ID or secret missing");
    return;
  }
  const result = await call("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: "invalid-test-code",
      grant_type: "authorization_code",
      redirect_uri: `${value("APP_URL").replace(/\/$/, "")}/api/auth/callback/google`,
    }),
  });
  const code = errorCode(result);
  if (result.status === 400 && code === "invalid_grant") {
    record("GOOGLE_OAUTH", "PASS", "client credentials accepted");
  } else if (result.status === 400 && /invalid_client|unauthorized_client/i.test(code)) {
    record("GOOGLE_OAUTH", "FAIL", `credentials rejected: ${code}`);
  } else {
    record("GOOGLE_OAUTH", "WARN", `unexpected response: HTTP ${result.status || "network"} ${code}`);
  }
}

async function checkResend() {
  const key = value("RESEND_API_KEY");
  if (!key) {
    record("RESEND", "FAIL", "API key missing");
    return;
  }
  // Send-only keys cannot list domains. An empty payload checks authentication
  // without sending an email; a 422 validation error means the key was accepted.
  const result = await call("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (result.ok || result.status === 422) {
    record("RESEND", "PASS", "send-only key accepted");
  } else if (result.status === 401 || result.status === 403) {
    record("RESEND", "FAIL", `credentials rejected: ${errorCode(result)}`);
  } else {
    record("RESEND", "WARN", `endpoint unreachable: HTTP ${result.status || "network"} ${result.error || errorCode(result)}`);
  }

  if (/@resend\.dev/i.test(value("EMAIL_FROM"))) {
    record("EMAIL_FROM", "WARN", "onboarding@resend.dev can only email the account owner; use a verified domain");
  } else {
    record("EMAIL_FROM", "PASS", "custom sender configured");
  }
}

async function checkInfrastructure() {
  const adminKey = value("OPENWA_ADMIN_API_KEY");
  if (adminKey) {
    const result = await call(`${value("OPENWA_URL").replace(/\/$/, "")}/api/health/ready`, {
      headers: { "X-API-Key": adminKey },
    });
    if (result.ok) record("OPENWA", "PASS", "gateway ready");
    else record("OPENWA", "WARN", `not reachable from host: ${result.error || errorCode(result)}`);
  }

  const health = await call(`${value("APP_URL").replace(/\/$/, "")}/api/health`);
  if (health.ok) record("APP_HEALTH", "PASS", health.text);
  else record("APP_HEALTH", "WARN", `app health unavailable: ${health.error || errorCode(health)}`);
}

async function main() {
  console.log("Smart Budget credential check (secrets are redacted)\n");
  checkStructure();
  await checkOpenAiCompatible("ZAI", {
    key: value("ZAI_API_KEY"),
    base: value("ZAI_BASE_URL", "https://api.z.ai/api/paas/v4"),
    model: value("ZAI_MODEL", "glm-4.7-flash"),
    fallbacks: value("ZAI_MODEL_FALLBACKS", "glm-4.5-flash").split(",").map((item) => item.trim()).filter(Boolean),
  });
  await checkOpenAiCompatible("OPENCODE", {
    key: value("OPENCODE_API_KEY", value("OPENAI_API_KEY")),
    base: value("OPENCODE_BASE_URL", "https://opencode.ai/inference/openai/v1"),
    model: value("OPENCODE_MODEL", "hy4-flash-free"),
    fallbacks: value("OPENCODE_MODEL_FALLBACKS", "mimo-v2.6-flash-free,iceman-free").split(",").map((item) => item.trim()).filter(Boolean),
  });
  await checkGoogle();
  await checkResend();
  await checkInfrastructure();

  const failed = results.filter((result) => result.status === "FAIL").length;
  const warned = results.filter((result) => result.status === "WARN").length;
  console.log(`\nSummary: ${results.length - failed - warned} passed, ${warned} warning(s), ${failed} failure(s).`);
  process.exitCode = failed ? 1 : 0;
}

await main();
