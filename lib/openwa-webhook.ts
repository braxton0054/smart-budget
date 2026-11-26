import "server-only";
import { createHash } from "node:crypto";
import type { WaSession } from "@prisma/client";
import { applyWebhookStatus, verifyWebhookSignature } from "@/lib/openwa";
import { getInboundQueue } from "@/lib/queues";

type Json = Record<string, unknown>;

export type OpenwaEnvelope = {
  event: string;
  sessionId: string;
  idempotencyKey: string;
  deliveryId?: string;
  data: Json;
};

/** Verify the raw body before trusting any field in it. */
export function verifyAndParseWebhook(
  rawBody: string,
  signature: string,
  secret: string,
): OpenwaEnvelope | null {
  if (!verifyWebhookSignature(rawBody, signature, secret)) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }

  const { event, sessionId, idempotencyKey, deliveryId, data } = parsed;
  if (
    typeof event !== "string" ||
    typeof sessionId !== "string" ||
    typeof idempotencyKey !== "string" ||
    !event ||
    !sessionId ||
    !idempotencyKey
  ) {
    return null;
  }

  return {
    event,
    sessionId,
    idempotencyKey,
    ...(typeof deliveryId === "string" ? { deliveryId } : {}),
    data: data && typeof data === "object" && !Array.isArray(data) ? (data as Json) : {},
  };
}

export async function enqueueOpenwaEvent(session: WaSession, envelope: OpenwaEnvelope): Promise<void> {
  await applyWebhookStatus(session, envelope.event, envelope.data);

  await getInboundQueue().add(
    "whatsapp-event",
    {
      shopId: session.shopId,
      waSessionId: session.id,
      openwaSessionId: session.openwaSessionId,
      event: envelope.event,
      sessionId: envelope.sessionId,
      idempotencyKey: envelope.idempotencyKey,
      deliveryId: envelope.deliveryId ?? null,
      data: envelope.data,
    },
    {
      jobId: createHash("sha256").update(envelope.idempotencyKey).digest("hex"),
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  );
}
