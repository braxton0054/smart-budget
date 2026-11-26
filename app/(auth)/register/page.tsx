import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "../_components/auth-form";
import { GoogleSignInButton } from "../_components/google-sign-in";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-nt-ink">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-nt-muted">
        Sign up with Google, or use your shop email and a password.
      </p>

      <div className="mt-8">
        <GoogleSignInButton />
      </div>

      <div className="my-7 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-nt-line" />
        <span className="text-xs tracking-wide text-nt-muted">or use email</span>
        <span className="h-px flex-1 bg-nt-line" />
      </div>

      <AuthForm mode="register" showHeading={false} />

      <p className="mt-6 text-center text-xs leading-relaxed text-nt-muted">
        By creating an account, you agree to the{" "}
        <Link href="/terms" className="text-nt-cyan underline-offset-4 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-nt-cyan underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
