import "server-only";
import { Prisma, type Payment, type SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadPlatformCredential } from "./platform";
import { stkProviders } from "./providers";

export const TRIAL_DAYS = 14;
export const PAID_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export type Entitlement = {
  status: SubscriptionStatus;
  planId: string;
  planCode: string;
  planName: string;
  priceMonthly: number;
  endsAt: string;
  startsAt: string;
  daysLeft: number;
  isTrial: boolean;
};

function toEntitlement(
  subscription: { status: SubscriptionStatus; currentPeriodStart: Date; currentPeriodEnd: Date; planId: string; plan: {
    code: string;
    name: string;
    priceMonthly: number;
  } },
  now = new Date(),
): Entitlement {
  return {
    status: subscription.status,
    planId: subscription.planId,
    planCode: subscription.plan.code,
    planName: subscription.plan.name,
    priceMonthly: subscription.plan.priceMonthly,
    startsAt: subscription.currentPeriodStart.toISOString(),
    endsAt: subscription.currentPeriodEnd.toISOString(),
    daysLeft: Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / DAY)),
    isTrial: subscription.status === "TRIAL",
  };
}

/** The single subscription that currently unlocks the dashboard. */
export async function currentEntitlement(shopId: string): Promise<Entitlement | null> {
  const subscription = await prisma.shopSubscription.findFirst({
    where: {
      shopId,
      status: { in: ["TRIAL", "ACTIVE", "GRACE"] },
      currentPeriodEnd: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { code: true, name: true, priceMonthly: true } } },
  });
  return subscription ? toEntitlement(subscription) : null;
}

/** A shop gets one free trial; after that every plan change needs payment. */
export async function canStartTrial(shopId: string) {
  return (await prisma.shopSubscription.count({ where: { shopId } })) === 0;
}

export async function startTrialSubscription(shopId: string, planId: string) {
  return prisma.$transaction(async (tx) => {
    // Serialize first-plan selection per shop so two direct POSTs cannot both
    // start a free trial on the same account.
    await tx.$queryRaw`SELECT id FROM "Shop" WHERE id = ${shopId} FOR UPDATE`;
    if ((await tx.shopSubscription.count({ where: { shopId } })) > 0) return null;

    return tx.shopSubscription.create({
      data: {
        shopId,
        planId,
        status: "TRIAL",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + TRIAL_DAYS * DAY),
      },
    });
  });
}

/** Create or reuse the unpaid subscription row that a payment will activate. */
export async function ensurePendingSubscription(shopId: string, planId: string) {
  const latest = await prisma.shopSubscription.findFirst({
    where: { shopId },
    orderBy: { createdAt: "desc" },
  });
  if (latest?.planId === planId && latest.status === "PAST_DUE") return latest;

  return prisma.shopSubscription.create({
    data: {
      shopId,
      planId,
      status: "PAST_DUE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    },
  });
}

export async function activateSubscriptionPayment(
  paymentId: string,
  details: { providerRef?: string | null; callbackPayload?: unknown } = {},
): Promise<boolean> {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.kind !== "SUBSCRIPTION" || payment.status !== "PENDING") return false;
    if (!payment.shopSubscriptionId) return false;

    const now = new Date();
    const paidEnd = new Date(now.getTime() + PAID_DAYS * DAY);
    const subscription = await tx.shopSubscription.findUnique({
      where: { id: payment.shopSubscriptionId },
    });
    if (!subscription) return false;
    const end = new Date(Math.max(paidEnd.getTime(), subscription.currentPeriodEnd.getTime()));

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        confirmedAt: now,
        ...(details.providerRef ? { providerRef: details.providerRef } : {}),
        ...(details.callbackPayload === undefined
          ? {}
          : { callbackPayload: details.callbackPayload as Prisma.InputJsonValue }),
      },
    });
    await tx.shopSubscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end },
    });
    await tx.shopSubscription.updateMany({
      where: {
        shopId: payment.shopId,
        id: { not: subscription.id },
        status: { in: ["TRIAL", "ACTIVE", "GRACE", "PAST_DUE"] },
      },
      data: { status: "CANCELLED" },
    });
    await tx.auditLog.create({
      data: {
        shopId: payment.shopId,
        action: "SUBSCRIPTION_ACTIVATED",
        target: subscription.id,
        metadata: { paymentId, provider: payment.provider, amount: payment.amount },
      },
    });
    return true;
  });
  return result;
}

export async function failSubscriptionPayment(paymentId: string) {
  const result = await prisma.payment.updateMany({
    where: { id: paymentId, kind: "SUBSCRIPTION", status: "PENDING" },
    data: { status: "FAILED" },
  });
  if (result.count > 0) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { shopId: true } });
    if (payment) {
      await prisma.auditLog.create({
        data: {
          shopId: payment.shopId,
          action: "SUBSCRIPTION_PAYMENT_FAILED",
          target: paymentId,
        },
      });
    }
  }
  return result.count > 0;
}

/** Polling fallback for missed callbacks. The callback remains the primary path. */
export async function reconcileSubscriptionPayment(paymentId: string): Promise<Payment["status"]> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.kind !== "SUBSCRIPTION" || payment.status !== "PENDING") {
    return payment?.status ?? "PENDING";
  }
  if (!payment.providerRef) return "PENDING";

  const credential = await loadPlatformCredential(payment.provider);
  if (!credential) return "PENDING";

  const result = await stkProviders[payment.provider].query(credential, payment.providerRef);
  if (result.status === "SUCCESS") {
    await activateSubscriptionPayment(paymentId, { callbackPayload: result.raw });
    return "PAID";
  }
  if (result.status === "FAILED") {
    await failSubscriptionPayment(paymentId);
    return "FAILED";
  }
  return "PENDING";
}
