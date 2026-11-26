import { Suspense } from "react";
import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { shortDate } from "@/lib/format";
import { deactivatePlatformBilling } from "../actions";
import { BillingForm } from "../_components/admin-forms";
import { Panel, StatusPill } from "../_components/ui";

async function Billing() {
  await connection();
  await requireSuperadmin();

  const credentials = await prisma.platformCredential.findMany({
    where: { key: { in: ["PAYHERO_PLATFORM", "DARAJA_PLATFORM"] } },
    select: { key: true, isActive: true, updatedAt: true },
    orderBy: { key: "asc" },
  });
  const byKey = new Map(credentials.map((credential) => [credential.key, credential]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Platform billing</h1>
        <p className="mt-2 text-sm text-nt-muted">
          Your own PayHero or Daraja (M-Pesa) account receives owner subscription payments. Shop payout keys are configured by each shop owner, not here.
        </p>
      </div>

      <Panel title="Platform collection accounts" description="Both providers are supported; activate the one you use for billing">
        <div className="space-y-4">
          {[
            { key: "PAYHERO_PLATFORM", label: "PayHero" },
            { key: "DARAJA_PLATFORM", label: "Daraja / M-Pesa" },
          ].map((provider) => {
            const credential = byKey.get(provider.key);
            return (
              <div key={provider.key} className="flex flex-wrap items-center justify-between gap-3 border-b border-nt-line/60 pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm text-nt-ink">{provider.label}</p>
                  <p className="text-xs text-nt-muted">
                    {credential ? `Updated ${shortDate(credential.updatedAt)}` : "Not configured yet"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={credential?.isActive ? "CONNECTED" : "DISCONNECTED"} />
                  {credential?.isActive && (
                    <form action={deactivatePlatformBilling}>
                      <input type="hidden" name="key" value={provider.key} />
                      <button
                        type="submit"
                        className="cursor-pointer rounded-lg border border-nt-line px-3 py-1.5 text-xs text-nt-muted transition-colors hover:border-nt-danger/50 hover:text-nt-ink"
                      >
                        Deactivate
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Add or replace credentials"
        description="Keys are encrypted with AES-256-GCM before storage and are never displayed again."
      >
        <BillingForm />
      </Panel>

      <Panel title="How owner subscriptions work" description="Flow documented for the platform operator">
        <ol className="space-y-3 text-sm text-nt-muted">
          <li>1. An owner picks a plan and starts an STK push from the active provider credentials.</li>
          <li>2. The callback is verified against the stored webhook secret before the subscription is activated.</li>
          <li>3. Missed callbacks are reconciled by polling; the audit log records every change.</li>
        </ol>
        <p className="mt-4 text-xs text-nt-muted">
          Callback URLs are generated from <code className="rounded bg-nt-raised px-1.5 py-0.5">APP_URL</code> and the
          stored webhook secret. Set APP_URL to the public HTTPS domain before taking live payments.
        </p>
      </Panel>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-nt-line bg-nt-surface/50" />}>
      <Billing />
    </Suspense>
  );
}
