"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { requestPasswordReset, signInWithEmail, signUpWithEmail } from "./auth-actions";
import { initialAuthState, type AuthMode, type AuthField } from "./auth-types";
import { AlertIcon, EyeIcon, EyeOffIcon, InfoIcon } from "./icons";

const copy = {
  login: {
    action: signInWithEmail,
    title: "Sign in with email",
    description: "Enter the details for your shop account.",
    submit: "Sign in",
    pending: "Signing in…",
  },
  register: {
    action: signUpWithEmail,
    title: "Create your account",
    description: "Start selling to customers on WhatsApp today.",
    submit: "Create account",
    pending: "Creating account…",
  },
  forgot: {
    action: requestPasswordReset,
    title: "Reset your password",
    description: "Enter your email and we'll send a reset link.",
    submit: "Send reset link",
    pending: "Sending…",
  },
} as const;

const fieldBase =
  "h-11 w-full rounded-lg border bg-nt-raised px-3 text-sm text-nt-ink transition-colors placeholder:text-nt-muted/70 hover:border-nt-cyan/40 focus:border-nt-cyan focus:outline-none";

function fieldClass(field?: AuthField, stateErrors?: { [K in AuthField]?: string }) {
  const hasError = field ? Boolean(stateErrors?.[field]) : false;
  return `${fieldBase} ${hasError ? "border-nt-danger" : "border-nt-line"}`;
}

export function AuthForm({ mode, showHeading = true }: { mode: AuthMode; showHeading?: boolean }) {
  const { action, title, description, submit, pending } = copy[mode];
  const [state, formAction, isPending] = useActionState(action, initialAuthState);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
  }, [state]);

  const errorFor = (field: AuthField) => state.errors?.[field];
  const describedBy = (field: AuthField, hint?: string) =>
    [hint, errorFor(field) ? `${field}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      {showHeading && (
        <>
          <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-nt-ink">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-nt-muted">{description}</p>
        </>
      )}

      <form action={formAction} aria-busy={isPending} noValidate className={showHeading ? "mt-8" : undefined}>
        {state.status !== "idle" && state.message && (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role={state.status === "error" ? "alert" : "status"}
            className={`mb-6 flex gap-3 rounded-lg border p-3 text-sm leading-relaxed ${
              state.status === "error"
                ? "border-nt-danger/40 bg-nt-danger/10 text-nt-ink"
                : "border-nt-cyan/30 bg-nt-cyan/10 text-nt-ink"
            }`}
          >
            {state.status === "error" ? (
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-nt-danger" />
            ) : (
              <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-nt-cyan" />
            )}
            <p>{state.message}</p>
          </div>
        )}

        <div className="space-y-5">
          {mode === "register" && (
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-nt-ink">
                Your name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Ada Okoye"
                maxLength={80}
                aria-invalid={Boolean(errorFor("name"))}
                aria-describedby={describedBy("name")}
                className={fieldClass("name", state.errors)}
              />
              {errorFor("name") && (
                <p id="name-error" className="mt-2 text-xs text-nt-danger">{errorFor("name")}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-nt-ink">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@yourshop.com"
              maxLength={254}
              aria-invalid={Boolean(errorFor("email"))}
              aria-describedby={describedBy("email")}
              className={fieldClass("email", state.errors)}
            />
            {errorFor("email") && (
              <p id="email-error" className="mt-2 text-xs text-nt-danger">{errorFor("email")}</p>
            )}
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <label htmlFor="password" className="block text-sm font-medium text-nt-ink">
                  Password
                </label>
                {mode === "login" && (
                  <Link href="/forgot-password" className="text-xs text-nt-cyan underline-offset-4 hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
                  maxLength={200}
                  aria-invalid={Boolean(errorFor("password"))}
                  aria-describedby={describedBy("password", mode === "register" ? "password-hint" : undefined)}
                  className={`${fieldClass("password", state.errors)} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((value) => !value)}
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                  aria-pressed={passwordVisible}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-nt-muted transition-colors hover:text-nt-ink"
                >
                  {passwordVisible ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
                </button>
              </div>
              {mode === "register" && (
                <p id="password-hint" className="mt-2 text-xs text-nt-muted">
                  At least 8 characters, with a letter and a number.
                </p>
              )}
              {errorFor("password") && (
                <p id="password-error" className="mt-2 text-xs text-nt-danger">{errorFor("password")}</p>
              )}
            </div>
          )}

          {mode === "login" && (
            <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-nt-muted">
              <input type="checkbox" name="remember" className="h-4 w-4 rounded border-nt-line bg-nt-raised accent-nt-cyan" />
              Keep me signed in
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-nt-cyan font-display text-sm font-semibold tracking-wide text-nt-on-neon transition-colors hover:bg-[#5ceeff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-nt-on-neon/30 border-t-nt-on-neon" aria-hidden="true" />
          )}
          {isPending ? pending : submit}
        </button>
      </form>

      <p className="mt-8 text-sm text-nt-muted">
        {mode === "login" && (
          <>
            New to Smart Budget?{" "}
            <Link href="/register" className="text-nt-cyan underline-offset-4 hover:underline">Create an account</Link>
          </>
        )}
        {mode === "register" && (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-nt-cyan underline-offset-4 hover:underline">Sign in</Link>
          </>
        )}
        {mode === "forgot" && (
          <Link href="/login" className="text-nt-cyan underline-offset-4 hover:underline">Back to sign in</Link>
        )}
      </p>
    </div>
  );
}
