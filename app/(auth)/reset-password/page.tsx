import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "../_components/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

type SearchParams = Promise<{ token?: string }>;

async function ResetPanel({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  const safeToken = typeof token === "string" && /^[a-f0-9]{64}$/.test(token) ? token : "";

  return (
    <div>
      <h1 className="font-display text-[2rem] font-semibold tracking-[-0.02em] text-nt-ink">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-nt-muted">
        {safeToken ? "Enter a new password for your shop account." : "This reset link isn't valid. Request a new one from the sign-in page."}
      </p>
      <ResetPasswordForm token={safeToken} />
    </div>
  );
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-nt-line bg-nt-surface/50" />}>
      <ResetPanel searchParams={searchParams} />
    </Suspense>
  );
}
