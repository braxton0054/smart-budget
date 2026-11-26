import { Suspense } from "react";
import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { shortDate } from "@/lib/format";
import { EmptyState, Panel, StatusPill } from "../_components/ui";

async function Shops() {
  await connection();
  await requireSuperadmin();

  const shops = await prisma.shop.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { email: true, name: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: { select: { name: true } } },
      },
      _count: { select: { products: true, customers: true, orders: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Shops</h1>
        <p className="mt-2 text-sm text-nt-muted">{shops.length} tenant(s) on the platform.</p>
      </div>

      <Panel title="All tenants" description="Read-only view of shop accounts and their current plan">
        {shops.length === 0 ? (
          <EmptyState message="No shops have been created yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="text-xs tracking-wide text-nt-muted">
                <tr className="border-b border-nt-line">
                  <th className="py-3 pr-4 font-medium">Shop</th>
                  <th className="py-3 pr-4 font-medium">Owner</th>
                  <th className="py-3 pr-4 font-medium">Plan</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Products</th>
                  <th className="py-3 pr-4 font-medium">Customers</th>
                  <th className="py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nt-line/60">
                {shops.map((shop) => {
                  const subscription = shop.subscriptions[0];
                  return (
                    <tr key={shop.id}>
                      <td className="py-3 pr-4">
                        <p className="text-nt-ink">{shop.name}</p>
                        <p className="text-xs text-nt-muted">/{shop.slug}</p>
                      </td>
                      <td className="py-3 pr-4 text-nt-muted">
                        <p>{shop.owner.name ?? "—"}</p>
                        <p className="text-xs">{shop.owner.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-nt-muted">{subscription?.plan.name ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <StatusPill status={subscription?.status ?? "PENDING"} />
                      </td>
                      <td className="py-3 pr-4 text-nt-muted">{shop._count.products}</td>
                      <td className="py-3 pr-4 text-nt-muted">{shop._count.customers}</td>
                      <td className="py-3 text-nt-muted">{shortDate(shop.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function ShopsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-nt-line bg-nt-surface/50" />}>
      <Shops />
    </Suspense>
  );
}
