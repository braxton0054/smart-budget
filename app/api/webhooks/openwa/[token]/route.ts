import { NextResponse } from "next/server";
import { findSessionByWebhookToken, readWebhookSecret } from "@/lib/openwa";
import { enqueueOpenwaEvent, verifyAndParseWebhook } from "@/lib/openwa-webhook";

/** Per-shop webhook: the URL token identifies the shop, the sealed secret signs the body. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await findSessionByWebhookToken(token);
  if (!session) return NextResponse.json({ error: "Unknown webhook" }, { status: 404 });

  const raw = await request.text();
  const envelope = verifyAndParseWebhook(
    raw,
    request.headers.get("x-openwa-signature") ?? "",
    readWebhookSecret(session),
  );
  if (!envelope) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  if (envelope.sessionId !== session.openwaSessionId) {
    return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
  }

  await enqueueOpenwaEvent(session, envelope);
  return NextResponse.json({ ok: true });
}
