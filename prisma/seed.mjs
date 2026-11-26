import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  { code: "STARTER", name: "Starter", priceMonthly: 1500, maxProducts: 50, maxMessages: 1000, maxSessions: 1, tokenCap: 500000 },
  { code: "GROWTH", name: "Growth", priceMonthly: 4500, maxProducts: 500, maxMessages: 10000, maxSessions: 3, tokenCap: 4000000 },
  { code: "SCALE", name: "Scale", priceMonthly: 12000, maxProducts: 5000, maxMessages: 100000, maxSessions: 10, tokenCap: 20000000 },
];

async function main() {
  const adminEmail = process.env.SUPERADMIN_EMAIL?.split(",")[0].trim().toLowerCase();
  if (adminEmail) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "SUPERADMIN", name: "Super Admin" },
      create: { email: adminEmail, role: "SUPERADMIN", name: "Super Admin" },
    });
  }

  for (const plan of plans) {
    await prisma.plan.upsert({ where: { code: plan.code }, update: plan, create: plan });
  }

  const shopCount = await prisma.shop.count();
  if (shopCount > 0) {
    console.log(`Seed complete: ${shopCount} shop(s) already present, demo data skipped.`);
    return;
  }

  const growth = await prisma.plan.findUniqueOrThrow({ where: { code: "GROWTH" } });
  const owner = await prisma.user.upsert({
    where: { email: "demo-owner@smartbudget.local" },
    update: {},
    create: { email: "demo-owner@smartbudget.local", name: "Demo Owner", role: "SHOP_OWNER" },
  });

  const shop = await prisma.shop.create({
    data: {
      name: "Demo Shop (seed data)",
      slug: "demo-shop",
      ownerId: owner.id,
      currency: "KES",
      subscriptions: {
        create: {
          planId: growth.id,
          status: "TRIAL",
          currentPeriodEnd: new Date(Date.now() + 14 * 86400000),
        },
      },
      waSessions: { create: { status: "DISCONNECTED" } },
    },
  });

  const product = await prisma.product.create({
    data: { shopId: shop.id, name: "Demo Product", price: 120000, sku: "DEMO-001" },
  });
  const customer = await prisma.customer.create({
    data: { shopId: shop.id, phone: "+254700000000", name: "Demo Customer", optedInAlerts: true },
  });
  const conversation = await prisma.conversation.create({
    data: { shopId: shop.id, customerId: customer.id },
  });
  await prisma.message.createMany({
    data: [
      { shopId: shop.id, conversationId: conversation.id, role: "CUSTOMER", body: "Is this in stock?" },
      { shopId: shop.id, conversationId: conversation.id, role: "AGENT", body: "Yes — demo stock is available." },
    ],
  });

  const order = await prisma.order.create({
    data: {
      shopId: shop.id,
      customerId: customer.id,
      conversationId: conversation.id,
      status: "PAID",
      total: 120000,
      items: {
        create: { shopId: shop.id, productId: product.id, name: product.name, quantity: 1, unitPrice: 120000 },
      },
    },
  });
  await prisma.invoice.create({
    data: { shopId: shop.id, orderId: order.id, number: "DEMO-INV-001", total: 120000 },
  });
  await prisma.payment.create({
    data: {
      shopId: shop.id,
      orderId: order.id,
      provider: "PAYHERO",
      amount: 120000,
      status: "PAID",
      confirmedAt: new Date(),
    },
  });
  await prisma.delivery.create({
    data: { shopId: shop.id, orderId: order.id, address: "Demo address", status: "DELIVERED" },
  });
  await prisma.auditLog.create({
    data: { shopId: shop.id, action: "SHOP_CREATED", target: shop.slug, metadata: { source: "seed" } },
  });

  console.log("Seed complete: superadmin, 3 plans, and labeled demo shop data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
