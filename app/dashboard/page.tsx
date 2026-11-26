import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { money, shortDate } from "@/lib/format";
import { toView } from "@/lib/openwa";
import { WhatsAppPanel } from "./_components/whatsapp-panel";

export const metadata: Metadata = { title: "Dashboard" };

async function DashboardContent() {
  await connection();
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (String((session.user as { role?: string }).role ?? "").toUpperCase() === "SUPERADMIN") {
    redirect("/admin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: {
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
    },
  });
  if (!user) redirect("/login");

  const shop = user.shops[0];

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

        {!shop ? (
          <div className="mt-10 rounded-xl border border-nt-line bg-nt-surface p-8 text-center">
            <h1 className="font-display text-2xl font-semibold">No shop yet</h1>
            <p className="mt-2 text-sm text-nt-muted">Create an account with email and password to get a shop, or contact the platform owner.</p>
          </div>
        ) : (
          <>
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
          </>
        )}
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
