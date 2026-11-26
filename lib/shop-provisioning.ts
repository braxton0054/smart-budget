import "server-only";
import { randomBytes } from "node:crypto";
import type { Shop } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// One shop per owner is created from the seeded STARTER plan, on a 14-day trial.
// This mirrors the original email-signup flow exactly; no extra features are added.
const TRIAL_DAYS = 14;
const STARTER_PLAN_CODE = "STARTER";

// Prevent two concurrent sign-ins for the same account from creating two shops.
const inFlight = new Map<string, Promise<void>>();

function shopSlug(name: string | null | undefined, email: string) {
  const base = (name?.trim() || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `${base || "shop"}-${randomBytes(2).toString("hex")}`;
}

/**
 * Give a signed-in owner a shop if they do not have one yet.
 * Returns the created shop, or null when the owner already has a shop or the
 * plans have not been seeded. Safe to call on every sign-in and dashboard load.
 */
export async function ensureShopForUser(input: {
  userId: string;
  email: string;
  name?: string | null;
}): Promise<Shop | null> {
  const existing = await prisma.shop.findFirst({
    where: { ownerId: input.userId },
    select: { id: true },
  });
  if (existing) return null;

  let pending = inFlight.get(input.userId);
  if (!pending) {
    pending = (async () => {
      const duplicate = await prisma.shop.findFirst({
        where: { ownerId: input.userId },
        select: { id: true },
      });
      if (duplicate) return;

      const starter = await prisma.plan.findUnique({
        where: { code: STARTER_PLAN_CODE },
        select: { id: true },
      });
      if (!starter) return;

      const shop = await prisma.shop.create({
        data: {
          name: `${input.name?.trim() || input.email.split("@")[0]}'s Shop`,
          slug: shopSlug(input.name, input.email),
          ownerId: input.userId,
          currency: "KES",
          subscriptions: {
            create: {
              planId: starter.id,
              status: "TRIAL",
              currentPeriodEnd: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
      await prisma.auditLog.create({
        data: {
          shopId: shop.id,
          actorId: input.userId,
          action: "SHOP_CREATED",
          target: shop.slug,
          metadata: { source: "sign_in_provisioning", plan: STARTER_PLAN_CODE },
        },
      });
    })().finally(() => {
      inFlight.delete(input.userId);
    });
    inFlight.set(input.userId, pending);
  }
  await pending;

  return prisma.shop.findFirst({ where: { ownerId: input.userId } });
}
