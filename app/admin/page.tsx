import { Suspense } from "react";
import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { getInboundQueue } from "@/lib/queues";
import { money, shortDate } from "@/lib/format";
import { EmptyState, Panel, StatCard, StatusPill } from "./_components/ui";

async function Overview() {
  await connection();
  const session = await requireSuperadmin();

  const [shopCount, ownerCount, activeSubs, paid, logs, plans, dbOk, redisOk, queueCounts] =
    await Promise.all([
      prisma.shop.count(),
      prisma.user.count({ where: { role: "SHOP_OWNER" } }),
      prisma.shopSubscription.count({ where: { status: "ACTIVE" } }),
      prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { shop: true, actor: true },
      }),
      prisma.plan.findMany({
        include: { _count: { select: { subscriptions: true } } },
        orderBy: { priceMonthly: "asc" },
      }),
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      getRedis().ping().then(() => true).catch(() => false),
      getInboundQueue().getJobCounts().catch(() => null),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Platform overview</h1>
        <p className="mt-2 text-sm text-nt-muted">
          Signed in as {session.user?.email}. All figures come from the live database.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Shops" value={shopCount} hint="Tenants on the platform" />
        <StatCard label="Shop owners" value={ownerCount} hint="Accounts with owner role" />
        <StatCard label="Active subscriptions" value={activeSubs} hint="Billing in good standing" />
        <StatCard label="Payments collected" value={money(paid._sum.amount ?? 0)} hint="Confirmed callbacks only" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Infrastructure" description="Live checks on the platform services">
          <dl className="space-y-4">
            {[
              { name: "PostgreSQL", ok: dbOk, detail: "Tenant and platform data" },
              { name: "Redis", ok: redisOk, detail: "Sessions, queues, rate limits" },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between gap-4">
                <div>
                  <dt className="text-sm text-nt-ink">{service.name}</dt>
                  <dd className="text-xs text-nt-muted">{service.detail}</dd>
                </div>
                <StatusPill status={service.ok ? "CONNECTED" : "DISCONNECTED"} />
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-t border-nt-line pt-4">
              <div>
                <p className="text-sm text-nt-ink">Inbound queue</p>
                <p className="text-xs text-nt-muted">Waiting messages from WhatsApp</p>
              </div>
              <span className="font-display text-xl text-nt-ink">
                {queueCounts ? queueCounts.waiting ?? 0 : "—"}
              </span>
            </div>
          </dl>
        </Panel>

        <Panel title="Plans at a glance" description="Subscribers per plan">
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-nt-ink">{plan.name}</p>
                  <p className="text-xs text-nt-muted">
                    {money(plan.priceMonthly)}/mo · {plan.tokenCap.toLocaleString()} tokens
                  </p>
                </div>
                <span className="font-display text-lg text-nt-cyan">{plan._count.subscriptions}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent activity" description="Latest audit entries across the platform">
        {logs.length === 0 ? (
          <EmptyState message="No activity recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs tracking-wide text-nt-muted">
                <tr className="border-b border-nt-line">
                  <th className="py-3 pr-4 font-medium">Action</th>
                  <th className="py-3 pr-4 font-medium">Shop</th>
                  <th className="py-3 pr-4 font-medium">Actor</th>
                  <th className="py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nt-line/60">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 pr-4 text-nt-ink">{log.action.replaceAll("_", " ")}</td>
                    <td className="py-3 pr-4 text-nt-muted">{log.shop?.name ?? "Platform"}</td>
                    <td className="py-3 pr-4 text-nt-muted">{log.actor?.email ?? "System"}</td>
                    <td className="py-3 text-nt-muted">{shortDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-nt-line bg-nt-surface/50" />}>
      <Overview />
    </Suspense>
  );
}
