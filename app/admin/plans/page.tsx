import { Suspense } from "react";
import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { compactNumber, money } from "@/lib/format";
import { PlanForm } from "../_components/admin-forms";
import { Panel } from "../_components/ui";

async function Plans() {
  await connection();
  await requireSuperadmin();

  const plans = await prisma.plan.findMany({
    orderBy: { priceMonthly: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Plans</h1>
        <p className="mt-2 text-sm text-nt-muted">
          Limits are enforced by the agent worker so one shop cannot exhaust platform capacity.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <Panel key={plan.id} title={plan.name} description={`${money(plan.priceMonthly)} per month`}>
            <dl className="space-y-3 text-sm">
              {[
                ["Subscribers", String(plan._count.subscriptions)],
                ["Products", compactNumber(plan.maxProducts)],
                ["Messages / month", compactNumber(plan.maxMessages)],
                ["WhatsApp sessions", String(plan.maxSessions)],
                ["LLM token cap", compactNumber(plan.tokenCap)],
                ["Grace period", `${plan.graceDays} days`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-nt-muted">{label}</dt>
                  <dd className="font-medium text-nt-ink">{value}</dd>
                </div>
              ))}
            </dl>
            <details className="mt-4 border-t border-nt-line pt-4">
              <summary className="cursor-pointer text-xs text-nt-cyan underline-offset-2 hover:underline">
                Edit limits and price
              </summary>
              <PlanForm
                plan={{
                  id: plan.id,
                  code: plan.code,
                  name: plan.name,
                  priceMonthly: plan.priceMonthly,
                  maxProducts: plan.maxProducts,
                  maxMessages: plan.maxMessages,
                  maxSessions: plan.maxSessions,
                  tokenCap: plan.tokenCap,
                  graceDays: plan.graceDays,
                  isActive: plan.isActive,
                }}
              />
            </details>
          </Panel>
        ))}
      </div>

      <Panel title="New plan" description="Create a new subscription tier with its own limits">
        <PlanForm />
      </Panel>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-nt-line bg-nt-surface/50" />}>
      <Plans />
    </Suspense>
  );
}
