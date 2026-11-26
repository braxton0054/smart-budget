"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { activePlatformProvider, callbackToken, callbackUrlFor } from "@/lib/billing/platform";
import { stkProviders } from "@/lib/billing/providers";
import {
  TRIAL_DAYS,
  canStartTrial,
  currentEntitlement,
  ensurePendingSubscription,
  failSubscriptionPayment,
  startTrialSubscription,
} from "@/lib/billing/subscriptions";
import { prisma } from "@/lib/prisma";
import { ensureShopForUser } from "@/lib/shop-provisioning";
import type { SubscribeState } from "./_components/form-types";

type OwnerResult = { error: SubscribeState } | { userId: string; shopId: string };

function errorState(message: string, errors?: Record<string, string>): SubscribeState {
  return { status: "error", message, errors };
}

async function ownerShop(): Promise<OwnerResult> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";
  if (!email) return { error: errorState("Your session expired. Sign in again.") };
  const role = String(((session?.user as { role?: string } | undefined)?.role ?? "").toUpperCase());
  if (role === "SUPERADMIN") {
    return { error: errorState("Superadmin accounts do not subscribe to plans.") };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, shops: { select: { id: true }, take: 1 } },
  });
  if (!user) return { error: errorState("Account not found. Sign in again.") };

  let shopId: string | undefined = user.shops[0]?.id;
  if (!shopId) {
    const shop = await ensureShopForUser({ userId: user.id, email: user.email, name: user.name });
    shopId = shop?.id;
  }
  if (!shopId) return { error: errorState("Your shop could not be created. Contact support.") };
  return { userId: user.id, shopId };
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  if (/^0\d{9}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254\d{9}$/.test(digits)) return digits;
  if (/^\d{9}$/.test(digits)) return `254${digits}`;
  return null;
}

export async function choosePlan(_state: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const planId = String(formData.get("planId") ?? "").trim();
  const owner = await ownerShop();
  if ("error" in owner) return owner.error;

  const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) return errorState("That plan is not available.", { planId: "Choose an available plan." });

  const entitlement = await currentEntitlement(owner.shopId);
  if (entitlement?.planId === plan.id) {
    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  if (await canStartTrial(owner.shopId)) {
    const trial = await startTrialSubscription(owner.shopId, plan.id);
    if (trial) {
      await prisma.auditLog.create({
        data: {
          shopId: owner.shopId,
          actorId: owner.userId,
          action: "SUBSCRIPTION_TRIAL_STARTED",
          target: plan.code,
          metadata: { days: TRIAL_DAYS },
        },
      });
    }
    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  const subscription = await ensurePendingSubscription(owner.shopId, plan.id);
  await prisma.auditLog.create({
    data: {
      shopId: owner.shopId,
      actorId: owner.userId,
      action: "SUBSCRIPTION_PLAN_SELECTED",
      target: plan.code,
      metadata: { subscriptionId: subscription.id },
    },
  });
  revalidatePath("/subscribe");
  return {
    status: "success",
    message: `${plan.name} selected. Send the M-Pesa prompt below to activate it.`,
    selectedPlan: { id: plan.id, code: plan.code, name: plan.name, priceMonthly: plan.priceMonthly },
  };
}

export async function startSubscriptionPayment(
  _state: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const planId = String(formData.get("planId") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? "").trim());

  const errors: Record<string, string> = {};
  if (!planId) errors.planId = "Choose a plan first.";
  if (!phone) errors.phone = "Enter a valid M-Pesa phone number, e.g. 0712345678.";
  if (Object.keys(errors).length > 0) return errorState("Check the highlighted fields.", errors);

  const owner = await ownerShop();
  if ("error" in owner) return owner.error;

  const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) return errorState("That plan is no longer available.", { planId: "Choose an available plan." });
  if (plan.priceMonthly < 100) {
    return errorState("This plan has no monthly price configured. Contact support.");
  }

  const pending = await prisma.payment.count({
    where: { shopId: owner.shopId, kind: "SUBSCRIPTION", status: "PENDING" },
  });
  if (pending > 0) {
    return errorState("A payment prompt is already pending. Check your phone before sending another.");
  }

  const active = await activePlatformProvider();
  if (!active) {
    return errorState(
      "Platform billing is not configured yet. Ask the administrator to add PayHero or Daraja credentials in Superadmin → Billing.",
    );
  }

  const subscription = await ensurePendingSubscription(owner.shopId, plan.id);
  const externalReference = `SB${randomBytes(5).toString("hex").toUpperCase()}`;
  let paymentId: string | null = null;

  try {
    const payment = await prisma.payment.create({
      data: {
        shopId: owner.shopId,
        shopSubscriptionId: subscription.id,
        kind: "SUBSCRIPTION",
        provider: active.provider,
        providerRef: externalReference,
        externalReference,
        amount: plan.priceMonthly,
        status: "PENDING",
      },
    });
    paymentId = payment.id;

    const callbackUrl = callbackUrlFor(
      active.provider,
      callbackToken(active.provider, active.credential.webhookSecret),
    );
    const result = await stkProviders[active.provider].start(active.credential, {
      amount: Math.max(1, Math.round(plan.priceMonthly / 100)),
      phone: phone!,
      reference: externalReference,
      callbackUrl,
      customerName: null,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: result.providerRef },
    });
    await prisma.auditLog.create({
      data: {
        shopId: owner.shopId,
        actorId: owner.userId,
        action: "SUBSCRIPTION_PAYMENT_STARTED",
        target: payment.id,
        metadata: { plan: plan.code, provider: active.provider, amount: plan.priceMonthly },
      },
    });
    revalidatePath("/dashboard");
    return {
      status: "success",
      message: "STK prompt sent. Enter your M-Pesa PIN on your phone; this page updates automatically.",
      selectedPlan: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
      },
      paymentId: payment.id,
    };
  } catch {
    if (paymentId) await failSubscriptionPayment(paymentId);
    return errorState(
      "The payment prompt could not be started. Check that billing credentials and the public APP_URL are configured, then try again.",
    );
  }
}
