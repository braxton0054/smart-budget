"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth-guards";
import { sealSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "./_components/form-types";

const CODE_PATTERN = /^[A-Z0-9_]{2,20}$/;

function numberField(
  formData: FormData,
  key: string,
  errors: Record<string, string>,
  label: string,
  max: number,
) {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);
  if (!raw || !Number.isInteger(value) || value < 0 || value > max) {
    errors[key] = `${label} must be a whole number between 0 and ${max}.`;
    return 0;
  }
  return value;
}

export async function savePlan(_state: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSuperadmin();
  const id = String(formData.get("id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const errors: Record<string, string> = {};

  if (!CODE_PATTERN.test(code)) errors.code = "Use 2–20 letters, numbers or underscores.";
  if (name.length < 2 || name.length > 60) errors.name = "Enter a name (2–60 characters).";

  const data = {
    code,
    name,
    priceMonthly: numberField(formData, "priceMonthly", errors, "Price", 10000000),
    maxProducts: numberField(formData, "maxProducts", errors, "Products", 10000000),
    maxMessages: numberField(formData, "maxMessages", errors, "Messages", 100000000),
    maxSessions: numberField(formData, "maxSessions", errors, "Sessions", 10000),
    tokenCap: numberField(formData, "tokenCap", errors, "Token cap", 1000000000),
    graceDays: numberField(formData, "graceDays", errors, "Grace days", 365),
    isActive: formData.get("isActive") === "on",
  };

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Check the highlighted fields and try again.", errors };
  }

  const duplicate = await prisma.plan.findFirst({ where: { code, ...(id ? { id: { not: id } } : {}) } });
  if (duplicate) {
    return { status: "error", message: "That plan code is already in use.", errors: { code: "Choose another code." } };
  }

  await prisma.plan.upsert({ where: id ? { id } : { code }, update: data, create: data });
  await prisma.auditLog.create({
    data: {
      action: id ? "PLAN_UPDATED" : "PLAN_CREATED",
      target: code,
      actorId: session.user?.id ?? null,
      metadata: { code, priceMonthly: data.priceMonthly },
    },
  });

  revalidatePath("/admin/plans");
  revalidatePath("/admin");
  return { status: "success", message: `${data.name} saved.` };
}

const PLATFORM_KEYS = ["PAYHERO_PLATFORM", "DARAJA_PLATFORM"] as const;

/**
 * Platform billing credentials: the superadmin's own PayHero or Daraja account,
 * used to collect owner subscription STK payments. NOT shop payout keys.
 */
export async function savePlatformBilling(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSuperadmin();
  const provider = String(formData.get("provider") ?? "") as "PAYHERO" | "DARAJA";
  const key = provider === "DARAJA" ? "DARAJA_PLATFORM" : "PAYHERO_PLATFORM";
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const apiSecret = String(formData.get("apiSecret") ?? "");
  const webhookSecret = String(formData.get("webhookSecret") ?? "").trim();
  const channelIdRaw = String(formData.get("channelId") ?? "").trim();
  const shortcode = String(formData.get("shortcode") ?? "").trim();
  const passkey = String(formData.get("passkey") ?? "");
  const environment = String(formData.get("environment") ?? "sandbox");
  const errors: Record<string, string> = {};

  if (provider !== "PAYHERO" && provider !== "DARAJA") errors.provider = "Choose a provider.";
  if (apiKey.length < 4) errors.apiKey = "Enter the API key.";
  if (apiSecret.length < 4) errors.apiSecret = "Enter the API secret.";
  if (webhookSecret.length < 12) errors.webhookSecret = "Enter a webhook secret of at least 12 characters.";
  if (provider === "PAYHERO") {
    const channelId = Number(channelIdRaw);
    if (!/^\d+$/.test(channelIdRaw) || !Number.isSafeInteger(channelId) || channelId <= 0) {
      errors.channelId = "Enter your PayHero payment channel ID.";
    }
  }
  if (provider === "DARAJA") {
    if (!/^\d{4,15}$/.test(shortcode)) errors.shortcode = "Enter the M-Pesa shortcode (4–15 digits).";
    if (passkey.length < 8) errors.passkey = "Enter the Daraja passkey.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Check the highlighted fields and try again.", errors };
  }

  const payload =
    provider === "DARAJA"
      ? { apiKey, apiSecret, webhookSecret, shortcode, passkey, environment }
      : { apiKey, apiSecret, webhookSecret, channelId: Number(channelIdRaw) };

  // Secrets never reach the database in plaintext and are never logged.
  const sealed = sealSecret(JSON.stringify(payload));
  await prisma.platformCredential.upsert({
    where: { key },
    update: { ...sealed, isActive: true },
    create: { key, ...sealed },
  });
  await prisma.auditLog.create({
    data: {
      action: "PLATFORM_BILLING_CREDENTIALS_SAVED",
      target: key,
      actorId: session.user?.id ?? null,
    },
  });

  revalidatePath("/admin/billing");
  return { status: "success", message: `${provider} platform credentials encrypted and saved.` };
}

export async function deactivatePlatformBilling(formData: FormData) {
  const session = await requireSuperadmin();
  const key = String(formData.get("key") ?? "");
  if (!PLATFORM_KEYS.includes(key as (typeof PLATFORM_KEYS)[number])) return;

  await prisma.platformCredential.updateMany({ where: { key }, data: { isActive: false } });
  await prisma.auditLog.create({
    data: {
      action: "PLATFORM_BILLING_CREDENTIALS_DEACTIVATED",
      target: key,
      actorId: session.user?.id ?? null,
    },
  });
  revalidatePath("/admin/billing");
}
