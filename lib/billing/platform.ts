import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { openSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import type { PlatformCredentialPayload, PlatformProvider } from "./providers";

export type { PlatformProvider } from "./providers";

export function platformKey(provider: PlatformProvider) {
  return provider === "DARAJA" ? "DARAJA_PLATFORM" : "PAYHERO_PLATFORM";
}

/**
 * The callback URL carries a secret-derived path token. Provider callbacks do
 * not carry a reliable shared signature, so an unguessable URL is the gate.
 */
export function callbackToken(provider: PlatformProvider, webhookSecret: string) {
  return createHmac("sha256", webhookSecret)
    .update(`smartbudget:platform:${provider}`)
    .digest("hex");
}

export function tokensMatch(expected: string, received: string) {
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(received, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function loadPlatformCredential(
  provider: PlatformProvider,
): Promise<PlatformCredentialPayload | null> {
  const record = await prisma.platformCredential.findUnique({
    where: { key: platformKey(provider) },
  });
  if (!record?.isActive) return null;

  let parsed: Partial<PlatformCredentialPayload>;
  try {
    parsed = JSON.parse(openSecret(record)) as Partial<PlatformCredentialPayload>;
  } catch {
    return null;
  }
  if (!parsed.apiKey || !parsed.apiSecret || !parsed.webhookSecret) return null;
  if (provider === "PAYHERO" && !Number(parsed.channelId)) return null;
  if (provider === "DARAJA" && (!parsed.shortcode || !parsed.passkey)) return null;

  return {
    apiKey: parsed.apiKey,
    apiSecret: parsed.apiSecret,
    webhookSecret: parsed.webhookSecret,
    channelId: Number(parsed.channelId) || undefined,
    shortcode: parsed.shortcode,
    passkey: parsed.passkey,
    environment: parsed.environment === "production" ? "production" : "sandbox",
  };
}

/** Pay Hero is the default collection provider; Daraja is the fallback. */
export async function activePlatformProvider(): Promise<{
  provider: PlatformProvider;
  credential: PlatformCredentialPayload;
} | null> {
  for (const provider of ["PAYHERO", "DARAJA"] as const) {
    const credential = await loadPlatformCredential(provider);
    if (credential) return { provider, credential };
  }
  return null;
}

export function callbackUrlFor(provider: PlatformProvider, token: string) {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) throw new Error("APP_URL must be set so payment callbacks can reach this app.");
  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !local) {
    throw new Error("APP_URL must use HTTPS for live payment callbacks.");
  }
  url.pathname = `/api/webhooks/platform/${provider.toLowerCase()}/${token}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}
