import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { AuthForm } from "../_components/auth-form";
import { GoogleSignInButton } from "../_components/google-sign-in";

export const metadata: Metadata = { title: "Sign in" };

type SearchParams = Promise<{ error?: string }>;

async function SignInPanel({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const [{ error }, session] = await Promise.all([searchParams, auth()]);
  if (session?.user) redirect("/dashboard");

  return (
    <div>
      <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-nt-ink">
        Sign in to Smart Budget
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-nt-muted">
        Continue with Google, or use your shop email and password.
      </p>

      {error && (
        <div role="alert" className="mt-8 rounded-lg border border-nt-danger/40 bg-nt-danger/10 p-3 text-sm text-nt-ink">
          {error === "AccessDenied"
            ? "That Google account isn't authorized. Ask the owner to add your email."
            : "Sign-in didn't complete. Try again."}
        </div>
      )}

      <div className="mt-8">
        <GoogleSignInButton />
      </div>

      <div className="my-7 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-nt-line" />
        <span className="text-xs tracking-wide text-nt-muted">or use email</span>
        <span className="h-px flex-1 bg-nt-line" />
      </div>

      <AuthForm mode="login" showHeading={false} />
    </div>
  );
}

function SignInFallback() {
  return (
    <div aria-busy="true">
      <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-nt-ink">
        Sign in to Smart Budget
      </h1>
      <p className="mt-2 text-sm text-nt-muted">Loading sign-in options…</p>
      <div className="mt-8 h-12 w-full animate-pulse rounded-lg border border-nt-line bg-nt-surface" />
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInPanel searchParams={searchParams} />
    </Suspense>
  );
}
