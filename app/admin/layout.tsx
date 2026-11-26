import type { Metadata } from "next";
import type { ReactNode } from "react";
import { signOut } from "@/auth";
import { AdminNav } from "./_components/admin-nav";

export const metadata: Metadata = { title: "Superadmin" };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-nt-void text-nt-ink lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-nt-line bg-nt-surface/40 px-4 py-5 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
        <div>
          <span className="font-display text-[1.1rem] font-semibold tracking-[0.08em]">
            SMART<span className="text-nt-cyan">BUDGET</span>
          </span>
          <p className="mt-1 text-[0.7rem] tracking-[0.16em] text-nt-muted">SUPERADMIN</p>
        </div>
        <div className="mt-6 lg:mt-10">
          <AdminNav />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-nt-line px-5 lg:px-8">
          <p className="text-sm text-nt-muted">Platform control</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-nt-line px-3 py-2 text-xs font-medium text-nt-muted transition-colors hover:border-nt-cyan/50 hover:text-nt-ink"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
