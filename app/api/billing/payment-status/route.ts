import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { currentEntitlement, reconcileSubscriptionPayment } from "@/lib/billing/subscriptions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (request.headers.get("x-smartbudget") !== "1") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const paymentId = new URL(request.url).searchParams.get("paymentId") ?? "";
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      shopId: true,
      status: true,
      kind: true,
      createdAt: true,
      shop: { select: { owner: { select: { email: true } } } },
    },
  });
  if (
    !payment ||
    payment.kind !== "SUBSCRIPTION" ||
    payment.shop.owner.email.toLowerCase() !== email
  ) {
    return NextResponse.json({ error: "Not allowed" }, { status: 404 });
  }

  let status = payment.status;
  // Give the signed callback a head start; polling is only the fallback.
  if (status === "PENDING" && Date.now() - payment.createdAt.getTime() > 15_000) {
    try {
      status = await reconcileSubscriptionPayment(paymentId);
    } catch {
      // A provider outage must not turn a valid pending payment into a failure.
      return NextResponse.json({ status: "PENDING" });
    }
  }

  const entitlement = await currentEntitlement(payment.shopId);
  return NextResponse.json({ status, entitlement });
}
