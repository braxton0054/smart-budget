import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Shop, WaSession, WaSessionStatus } from "@prisma/client";
import { openSecret, sealSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type Json = Record<string, unknown>;

export type OpenwaSessionDto = {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
  pushName?: string | null;
  connectedAt?: string | null;
  lastActive?: string | null;
  lastError?: string | null;
  restriction?: Json | null;
  engineLoaded?: boolean;
};

export type ShopWaStatus = {
  status: WaSessionStatus;
  openwaStatus: string | null;
  phoneNumber: string | null;
  restriction: string | null;
  lastError: string | null;
  qrCode: string | null;
  hasSession: boolean;
};

export class OpenwaError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "OpenwaError";
  }
}

const provisioning = new Map<string, Promise<WaSession>>();

function gatewayUrl(path: string): URL {
  const base = process.env.OPENWA_URL ?? "http://127.0.0.1:2785";
  return new URL(path, base.endsWith("/") ? base : `${base}/`);
}

function adminKey(): string {
  const key = process.env.OPENWA_ADMIN_API_KEY ?? process.env.OPENWA_API_KEY;
  if (!key) throw new Error("OPENWA_ADMIN_API_KEY is not configured");
  return key;
}

function shopKey(session: Pick<WaSession, "apiKeyCiphertext" | "apiKeyIv" | "apiKeyAuthTag">): string {
  if (!session.apiKeyCiphertext || !session.apiKeyIv || !session.apiKeyAuthTag) {
    throw new Error("This shop has no OpenWA API key");
  }
  return openSecret({
    ciphertext: session.apiKeyCiphertext,
    iv: session.apiKeyIv,
    authTag: session.apiKeyAuthTag,
  });
}

function shopWebhookSecret(
  session: Pick<WaSession, "webhookSecretCiphertext" | "webhookSecretIv" | "webhookSecretAuthTag">,
): string {
  if (!session.webhookSecretCiphertext || !session.webhookSecretIv || !session.webhookSecretAuthTag) {
    throw new Error("This shop has no webhook secret");
  }
  return openSecret({
    ciphertext: session.webhookSecretCiphertext,
    iv: session.webhookSecretIv,
    authTag: session.webhookSecretAuthTag,
  });
}

async function request<T>(
  path: string,
  apiKey: string,
  options: { method?: string; body?: Json } = {},
): Promise<T> {
  const response = await fetch(gatewayUrl(path.replace(/^\//, "")), {
    method: options.method ?? "GET",
    headers: {
      "X-API-Key": apiKey,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const raw = await response.text();
    let message = raw.slice(0, 400) || response.statusText;
    try {
      const parsed = JSON.parse(raw) as { message?: string | string[] };
      if (typeof parsed.message === "string") message = parsed.message;
      else if (Array.isArray(parsed.message)) message = parsed.message.join("; ");
    } catch {
      // Keep the raw response text.
    }
    throw new OpenwaError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const adminRequest = <T>(path: string, options: { method?: string; body?: Json } = {}) =>
  request<T>(`/api/${path}`, adminKey(), options);

const sessionRequest = <T>(
  session: Pick<WaSession, "apiKeyCiphertext" | "apiKeyIv" | "apiKeyAuthTag">,
  path: string,
  options: { method?: string; body?: Json } = {},
) => request<T>(`/api/${path}`, shopKey(session), options);

export function webhookTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function mapOpenwaStatus(status: string, restriction?: Json | null): WaSessionStatus {
  if (status === "ready") return "CONNECTED";
  const kind = String((restriction as { kind?: unknown } | null)?.kind ?? "").toLowerCase();
  if (["tos_block", "smb_tos_block", "biz_quality", "spam", "ban"].includes(kind)) return "BANNED";
  if (["disconnected", "failed", "logout"].includes(status)) return "DISCONNECTED";
  return "CONNECTING";
}

async function syncFromGateway(session: WaSession, dto: OpenwaSessionDto): Promise<WaSession> {
  const status = mapOpenwaStatus(dto.status, dto.restriction);
  return prisma.waSession.update({
    where: { id: session.id },
    data: {
      openwaStatus: dto.status,
      status,
      phoneNumber: dto.phone ?? session.phoneNumber,
      lastError: dto.lastError ?? null,
      restriction: dto.restriction ? JSON.stringify(dto.restriction) : null,
      lastSeenAt: dto.lastActive ? new Date(dto.lastActive) : session.lastSeenAt,
      connectedAt:
        status === "CONNECTED" ? (session.connectedAt ?? new Date()) : session.connectedAt,
    },
  });
}

/** Create the OpenWA session, its session-scoped key, and its signed webhook. */
async function provision(shop: Shop): Promise<WaSession> {
  const existing = await prisma.waSession.findFirst({
    where: { shopId: shop.id, openwaSessionId: { not: null } },
  });
  if (existing) return existing;

  const inFlight = provisioning.get(shop.id);
  if (inFlight) return inFlight;

  const job = (async () => {
    const name = `shop-${shop.id}`;
    const created = await adminRequest<OpenwaSessionDto>("sessions", {
      method: "POST",
      body: { name },
    });
    const key = await adminRequest<{ id: string; apiKey: string }>("auth/api-keys", {
      method: "POST",
      body: { name: `${name}-worker`, role: "operator", allowedSessions: [created.id] },
    });

    const webhookToken = randomBytes(32).toString("base64url");
    const webhookSecret = randomBytes(32).toString("base64url");
    // The gateway runs in Docker, so its callback host is not necessarily the
    // browser-facing APP_URL. Allow a dedicated reachability override.
    const appUrl = (
      process.env.OPENWA_CALLBACK_URL ??
      process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000"
    ).replace(/\/$/, "");

    const sealedKey = sealSecret(key.apiKey);
    const sealedWebhookSecret = sealSecret(webhookSecret);

    try {
      const webhook = await request<{ id: string }>(`/api/sessions/${created.id}/webhooks`, key.apiKey, {
        method: "POST",
        body: {
          url: `${appUrl}/api/webhooks/openwa/${webhookToken}`,
          events: [
            "message.received",
            "message.sent",
            "message.ack",
            "message.failed",
            "session.status",
            "session.qr",
            "session.authenticated",
            "session.disconnected",
            "session.restriction",
            "session.reconnect_loop",
          ],
          secret: webhookSecret,
          retryCount: 3,
        },
      });

      return prisma.waSession.create({
        data: {
          shopId: shop.id,
          status: "CONNECTING",
          openwaSessionId: created.id,
          openwaStatus: created.status,
          apiKeyId: key.id,
          apiKeyCiphertext: sealedKey.ciphertext,
          apiKeyIv: sealedKey.iv,
          apiKeyAuthTag: sealedKey.authTag,
          webhookId: webhook.id,
          webhookTokenHash: webhookTokenHash(webhookToken),
          webhookSecretCiphertext: sealedWebhookSecret.ciphertext,
          webhookSecretIv: sealedWebhookSecret.iv,
          webhookSecretAuthTag: sealedWebhookSecret.authTag,
        },
      });
    } catch (error) {
      // No half-provisioned gateway session is left behind.
      await adminRequest(`auth/api-keys/${key.id}/revoke`, { method: "POST" }).catch(() => undefined);
      await adminRequest(`sessions/${created.id}`, { method: "DELETE" }).catch(() => undefined);
      throw error;
    }
  })();

  provisioning.set(shop.id, job);
  try {
    return await job;
  } finally {
    provisioning.delete(shop.id);
  }
}

export async function findShopSession(shopId: string): Promise<WaSession | null> {
  return prisma.waSession.findFirst({
    where: { shopId, openwaSessionId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
}

export async function findSessionByWebhookToken(token: string): Promise<WaSession | null> {
  return prisma.waSession.findUnique({ where: { webhookTokenHash: webhookTokenHash(token) } });
}

export async function findSessionByOpenwaId(openwaSessionId: string): Promise<WaSession | null> {
  return prisma.waSession.findUnique({ where: { openwaSessionId } });
}

export async function connectShopSession(shop: Shop): Promise<ShopWaStatus> {
  const session = await provision(shop);
  const dto = await sessionRequest<OpenwaSessionDto>(session, `sessions/${session.openwaSessionId}/start`, {
    method: "POST",
  });
  const synced = await syncFromGateway(session, dto);
  return toView(synced, null);
}

export async function refreshShopSession(shopId: string): Promise<ShopWaStatus | null> {
  const session = await findShopSession(shopId);
  if (!session?.openwaSessionId) return null;

  let dto = await sessionRequest<OpenwaSessionDto>(session, `sessions/${session.openwaSessionId}`);
  // Restored credentials survive a gateway restart, but AUTO_START_SESSIONS is
  // off so the engine has to be brought back explicitly on the first check.
  if (dto.status === "ready" && dto.engineLoaded === false) {
    dto = await sessionRequest<OpenwaSessionDto>(session, `sessions/${session.openwaSessionId}/start`, {
      method: "POST",
    });
  }
  const synced = await syncFromGateway(session, dto);
  let qrCode: string | null = null;
  if (synced.openwaStatus === "qr_ready") {
    try {
      const qr = await sessionRequest<{ qrCode: string }>(session, `sessions/${session.openwaSessionId}/qr`);
      qrCode = qr.qrCode;
    } catch {
      // The QR can expire between the status call and the QR call; polling retries.
    }
  }
  return toView(synced, qrCode);
}

export async function disconnectShopSession(shopId: string): Promise<ShopWaStatus | null> {
  const session = await findShopSession(shopId);
  if (!session?.openwaSessionId) return null;
  await sessionRequest(session, `sessions/${session.openwaSessionId}/stop`, { method: "POST" });
  const dto = await sessionRequest<OpenwaSessionDto>(session, `sessions/${session.openwaSessionId}`);
  const synced = await syncFromGateway(session, dto);
  return toView({ ...synced, status: "DISCONNECTED" }, null);
}

export async function forgetShopSession(shopId: string): Promise<void> {
  const session = await findShopSession(shopId);
  if (!session?.openwaSessionId) return;
  if (session.apiKeyId) {
    await adminRequest(`auth/api-keys/${session.apiKeyId}/revoke`, { method: "POST" }).catch(() => undefined);
  }
  await adminRequest(`sessions/${session.openwaSessionId}`, { method: "DELETE" }).catch(() => undefined);
  await prisma.waSession.delete({ where: { id: session.id } });
}

export function readWebhookSecret(session: WaSession): string {
  return shopWebhookSecret(session);
}

export async function applyWebhookStatus(session: WaSession, event: string, data: Json): Promise<WaSession> {
  let status = session.status;
  let openwaStatus = session.openwaStatus;
  let phoneNumber = session.phoneNumber;
  let restriction = session.restriction;

  if (event === "session.status" && typeof data.status === "string") {
    openwaStatus = data.status;
    status = mapOpenwaStatus(data.status);
  } else if (event === "session.authenticated") {
    openwaStatus = "ready";
    status = "CONNECTED";
    if (typeof data.phone === "string") phoneNumber = data.phone;
  } else if (event === "session.disconnected") {
    openwaStatus = "disconnected";
    status = "DISCONNECTED";
  } else if (event === "session.restriction") {
    restriction = JSON.stringify(data);
    if (data.active === true) status = "BANNED";
  }

  if (status === session.status && openwaStatus === session.openwaStatus && phoneNumber === session.phoneNumber && restriction === session.restriction) {
    return session;
  }

  return prisma.waSession.update({
    where: { id: session.id },
    data: {
      status,
      openwaStatus,
      phoneNumber,
      restriction,
      lastSeenAt: new Date(),
      connectedAt: status === "CONNECTED" ? (session.connectedAt ?? new Date()) : session.connectedAt,
    },
  });
}

export function toView(session: WaSession | null, qrCode: string | null = null): ShopWaStatus {
  if (!session) {
    return {
      status: "DISCONNECTED",
      openwaStatus: null,
      phoneNumber: null,
      restriction: null,
      lastError: null,
      qrCode: null,
      hasSession: false,
    };
  }
  return {
    status: session.status,
    openwaStatus: session.openwaStatus,
    phoneNumber: session.phoneNumber,
    restriction: session.restriction,
    lastError: session.lastError,
    qrCode,
    hasSession: Boolean(session.openwaSessionId),
  };
}
