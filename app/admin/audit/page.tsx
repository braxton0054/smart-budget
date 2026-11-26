import { Suspense } from "react";
import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { shortDate } from "@/lib/format";
import { EmptyState, Panel } from "../_components/ui";

async function Audit() {
  await connection();
  await requireSuperadmin();

  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { shop: { select: { name: true } }, actor: { select: { email: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Audit log</h1>
        <p className="mt-2 text-sm text-nt-muted">Most recent 100 events across all tenants.</p>
      </div>

      <Panel title="Events" description="Actor, shop and action for each recorded event">
        {logs.length === 0 ? (
          <EmptyState message="No audit events yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-xs tracking-wide text-nt-muted">
                <tr className="border-b border-nt-line">
                  <th className="py-3 pr-4 font-medium">When</th>
                  <th className="py-3 pr-4 font-medium">Action</th>
                  <th className="py-3 pr-4 font-medium">Shop</th>
                  <th className="py-3 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nt-line/60">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 pr-4 text-nt-muted">{shortDate(log.createdAt)}</td>
                    <td className="py-3 pr-4 text-nt-ink">{log.action.replaceAll("_", " ")}</td>
                    <td className="py-3 pr-4 text-nt-muted">{log.shop?.name ?? "Platform"}</td>
                    <td className="py-3 text-nt-muted">{log.actor?.email ?? "System"}</td>
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

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-nt-line bg-nt-surface/50" />}>
      <Audit />
    </Suspense>
  );
}
