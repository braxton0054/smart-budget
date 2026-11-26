import { Suspense } from "react";
import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { compactNumber, shortDate } from "@/lib/format";
import { EmptyState, Panel, StatusPill } from "../_components/ui";

async function Subscriptions() {
  await connection();
  await requireSuperadmin();

  const subscriptions = await prisma.shopSubscription.findMany({
    orderBy: { createdAt: "desc" },
    include: { shop: { select: { name: true, slug: true } }, plan: { select: { name: true, maxMessages: true, tokenCap: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Subscriptions</h1>
        <p className="mt-2 text-sm text-nt-muted">
          Usage against plan caps. Shops past their grace period should have the agent paused.
        </p>
      </div>

      <Panel title="All subscriptions" description="Live plan status and consumption">
        {subscriptions.length === 0 ? (
          <EmptyState message="No subscriptions yet." />
        ) : (
          <div className="space-y-5">
            {subscriptions.map((subscription) => {
              const messagePct = Math.min(100, Math.round((subscription.messagesUsed / subscription.plan.maxMessages) * 100));
              const tokenPct = Math.min(100, Math.round((subscription.tokensUsed / subscription.plan.tokenCap) * 100));
              return (
                <div key={subscription.id} className="rounded-lg border border-nt-line bg-nt-raised/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-nt-ink">{subscription.shop.name}</p>
                      <p className="text-xs text-nt-muted">
                        {subscription.plan.name} · renews {shortDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                    <StatusPill status={subscription.status} />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {[
                      { label: "Messages", used: subscription.messagesUsed, cap: subscription.plan.maxMessages, pct: messagePct },
                      { label: "Tokens", used: subscription.tokensUsed, cap: subscription.plan.tokenCap, pct: tokenPct },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div className="flex justify-between text-xs text-nt-muted">
                          <span>{metric.label}</span>
                          <span>{compactNumber(metric.used)} / {compactNumber(metric.cap)}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nt-line">
                          <div
                            className="h-full rounded-full bg-nt-cyan"
                            style={{ width: `${metric.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-nt-line bg-nt-surface/50" />}>
      <Subscriptions />
    </Suspense>
  );
}
