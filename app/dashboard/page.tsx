import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Prisma } from "@prisma/client";
import { auth, signOut } from "@/auth";
import { currentEntitlement } from "@/lib/billing/subscriptions";
import { prisma } from "@/lib/prisma";
import { ensureShopForUser } from "@/lib/shop-provisioning";
import { money, shortDate } from "@/lib/format";
import { toView } from "@/lib/openwa";
import { WhatsAppPanel } from "./_components/whatsapp-panel";

export const metadata: Metadata = { title: "Dashboard" };

const shopInclude = {
  shops: {
    include: {
      waSessions: true,
      products: true,
      customers: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: { select: { phone: true, name: true } } },
      },
    },
  },
} satisfies Prisma.UserInclude;

async function DashboardContent() {
  await connection();
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (String((session.user as { role?: string }).role ?? "").toUpperCase() === "SUPERADMIN") {
    redirect("/admin");
  }

  const email = session.user.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email }, include: shopInclude });
  if (!user) redirect("/login");

  // Owners created before shop provisioning was wired up still self-heal here.
  if (user.shops.length === 0) {
    await ensureShopForUser({ userId: user.id, email: user.email, name: user.name });
    user = await prisma.user.findUnique({ where: { email }, include: shopInclude });
    if (!user) redirect("/login");
  }

  const shop = user.shops[0];
  if (!shop) redirect("/subscribe");

  // The whole dashboard stays behind a trial or a paid subscription.
  const entitlement = await currentEntitlement(shop.id);
  if (!entitlement) redirect("/subscribe");

  return (
    <main className="min-h-dvh bg-nt-void px-5 py-8 text-nt-ink sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-nt-line pb-6">
          <div>
            <span className="font-display text-lg font-semibold tracking-[0.08em]">
              SMART<span className="text-nt-cyan">BUDGET</span>
            </span>
            <p className="mt-1 text-xs text-nt-muted">{session.user.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="cursor-pointer rounded-lg border border-nt-line px-4 py-2 text-sm text-nt-muted transition-colors hover:border-nt-cyan/50 hover:text-nt-ink"
            >
              Sign out
            </button>
          </form>
        </header>

        <section
          aria-label="Subscription status"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-nt-line bg-nt-surface px-5 py-4"
        >
          <div>
            <p className="text-sm font-medium text-nt-ink" role="status">
              {entitlement.isTrial ? `${entitlement.planName} free trial` : `${entitlement.planName} subscription`}
            </p>
            <p className="mt-1 text-xs text-nt-muted">
              {entitlement.isTrial
                ? `${entitlement.daysLeft} day${entitlement.daysLeft === 1 ? "" : "s"} left. Pay to keep the dashboard and WhatsApp active.`
                : `Active until ${shortDate(entitlement.endsAt)}. ${money(entitlement.priceMonthly)} / month.`}
            </p>
          </div>
          <Link
            href="/subscribe?pay=1"
            className="rounded-lg border border-nt-cyan/50 px-4 py-2 text-sm text-nt-cyan transition-colors hover:bg-nt-cyan/10"
          >
            {entitlement.isTrial ? "Pay now" : "Manage plan"}
          </Link>
        </section>

        <h1 className="mt-10 font-display text-3xl font-semibold tracking-[-0.02em]">{shop.name}</h1>
        <WhatsAppPanel shopId={shop.id} initial={toView(shop.waSessions[0] ?? null)} />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Products", value: shop.products.length },
            { label: "Customers", value: shop.customers.length },
            { label: "Orders", value: shop.orders.length },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-nt-line bg-nt-surface p-5">
              <p className="text-xs text-nt-muted">{item.label}</p>
              <p className="mt-2 font-display text-3xl text-nt-ink tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-nt-line bg-nt-surface">
          <div className="border-b border-nt-line px-5 py-4">
            <h2 className="font-display text-lg font-semibold">Recent orders</h2>
          </div>
          {shop.orders.length === 0 ? (
            <p role="status" className="px-5 py-10 text-center text-sm text-nt-muted">
              No orders yet. Connect WhatsApp and add products to start selling.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs text-nt-muted">
                  <tr className="border-b border-nt-line">
                    <th scope="col" className="py-3 pr-4 font-medium">Customer</th>
                    <th scope="col" className="py-3 pr-4 font-medium">Total</th>
                    <th scope="col" className="py-3 pr-4 font-medium">Status</th>
                    <th scope="col" className="py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nt-line/60">
                  {shop.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3 pr-4 text-nt-ink">{order.customer.name ?? order.customer.phone}</td>
                      <td className="tabular-nums py-3 pr-4 text-nt-ink">{money(order.total, order.currency)}</td>
                      <td className="py-3 pr-4 text-nt-muted">{order.status.toLowerCase()}</td>
                      <td className="py-3 text-nt-muted">{shortDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-nt-void" aria-busy="true" />}>
      <DashboardContent />
    </Suspense>
  );
}
