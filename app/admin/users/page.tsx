import { Suspense } from "react";
import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { shortDate } from "@/lib/format";
import { EmptyState, Panel, StatusPill } from "../_components/ui";

async function Users() {
  await connection();
  await requireSuperadmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { shops: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">Users</h1>
        <p className="mt-2 text-sm text-nt-muted">
          {users.length} account(s). Superadmins sign in with Google only.
        </p>
      </div>

      <Panel title="Accounts" description="Roles determine what a user can access">
        {users.length === 0 ? (
          <EmptyState message="No accounts yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs tracking-wide text-nt-muted">
                <tr className="border-b border-nt-line">
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Shops</th>
                  <th className="py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nt-line/60">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3 pr-4 text-nt-ink">{user.email}</td>
                    <td className="py-3 pr-4 text-nt-muted">{user.name ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <StatusPill status={user.role} />
                    </td>
                    <td className="py-3 pr-4 text-nt-muted">{user._count.shops}</td>
                    <td className="py-3 text-nt-muted">{shortDate(user.createdAt)}</td>
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

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-nt-line bg-nt-surface/50" />}>
      <Users />
    </Suspense>
  );
}
