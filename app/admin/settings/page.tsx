import { Suspense } from "react";
import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guards";
import { Panel, StatusPill } from "../_components/ui";

async function Settings() {
  await connection();
  const session = await requireSuperadmin();

  const configured = (value: string | undefined) => Boolean(value && value.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Settings</h1>
        <p className="mt-2 text-sm text-nt-muted">
          Platform identity and integration status. Secret values are never shown here.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Superadmin" description="Google-only account">
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-nt-muted">Email</dt>
              <dd className="text-nt-ink">{session.user?.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-nt-muted">Role</dt>
              <dd><StatusPill status="SUPERADMIN" /></dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-nt-muted">Password</dt>
              <dd className="text-nt-muted">None — Google sign-in only</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Integrations" description="Presence checks only; no credentials are displayed">
          <dl className="space-y-4 text-sm">
            {[
              ["PostgreSQL", configured(process.env.DATABASE_URL)],
              ["Redis", configured(process.env.REDIS_URL)],
              ["Google OAuth", configured(process.env.GOOGLE_CLIENT_ID) && configured(process.env.GOOGLE_CLIENT_SECRET)],
              ["Resend", configured(process.env.RESEND_API_KEY)],
              ["OpenAI", configured(process.env.OPENAI_API_KEY)],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex items-center justify-between gap-4">
                <dt className="text-nt-muted">{label}</dt>
                <dd><StatusPill status={ok ? "CONNECTED" : "DISCONNECTED"} /></dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-t border-nt-line pt-4">
              <dt className="text-nt-muted">Payment provider keys</dt>
              <dd className="text-right text-xs text-nt-muted">In dashboards / encrypted per shop</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-nt-line bg-nt-surface/50" />}>
      <Settings />
    </Suspense>
  );
}
