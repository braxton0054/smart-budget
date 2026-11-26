import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  callbackToken,
  loadPlatformCredential,
  tokensMatch,
  type PlatformProvider,
} from "@/lib/billing/platform";
import { stkProviders } from "@/lib/billing/providers";
import { activateSubscriptionPayment, failSubscriptionPayment } from "@/lib/billing/subscriptions";
import { prisma } from "@/lib/prisma";

const MAX_BODY_BYTES = 64 * 1024;

async function readBoundedText(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string; token: string }> }) {
  const { provider: rawProvider, token } = await params;
  const provider = rawProvider.toUpperCase() as PlatformProvider;
  if (provider !== "PAYHERO" && provider !== "DARAJA") {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const credential = await loadPlatformCredential(provider);
  if (!credential) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  if (!tokensMatch(callbackToken(provider, credential.webhookSecret), token)) {
    return NextResponse.json({ error: "Invalid callback token" }, { status: 401 });
  }

  let body: unknown;
  try {
    const text = await readBoundedText(request);
    if (text === null) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = stkProviders[provider].parseCallback(body);
  const references = [parsed.externalReference, parsed.providerRef].filter(
    (value): value is string => Boolean(value),
  );
  if (references.length === 0) return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });

  const payment = await prisma.payment.findFirst({
    where: {
      kind: "SUBSCRIPTION",
      provider,
      OR: [{ externalReference: { in: references } }, { providerRef: { in: references } }],
    },
  });
  if (!payment) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });

  if (parsed.amount !== null && parsed.amount !== Math.round(payment.amount / 100)) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  if (parsed.status === "SUCCESS") {
    await activateSubscriptionPayment(payment.id, {
      providerRef: parsed.providerRef,
      callbackPayload: body,
    });
    revalidatePath("/dashboard");
  } else if (payment.status === "PENDING" && (await failSubscriptionPayment(payment.id))) {
    revalidatePath("/dashboard");
  }

  return NextResponse.json({ received: true });
}
