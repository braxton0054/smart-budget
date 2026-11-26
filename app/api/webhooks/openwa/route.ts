import { NextResponse } from "next/server";
import { findSessionByOpenwaId } from "@/lib/openwa";
import { enqueueOpenwaEvent, verifyAndParseWebhook } from "@/lib/openwa-webhook";

/**
 * Legacy gateway-level receiver. New sessions register their own signed URL at
 * /api/webhooks/openwa/<token>; this route remains for an existing shared webhook.
 */
export async function POST(request: Request) {
  const secret = process.env.OPENWA_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const raw = await request.text();
  const envelope = verifyAndParseWebhook(raw, request.headers.get("x-openwa-signature") ?? "", secret);
  if (!envelope) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const session = await findSessionByOpenwaId(envelope.sessionId);
  if (!session) {
    console.warn("OpenWA webhook for an unprovisioned session", envelope.sessionId);
    return NextResponse.json({ ok: true, routed: false });
  }

  await enqueueOpenwaEvent(session, envelope);
  return NextResponse.json({ ok: true, routed: true });
}
