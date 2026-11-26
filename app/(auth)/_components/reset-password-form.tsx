"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { resetPassword } from "./auth-actions";
import { initialAuthState } from "./auth-types";
import { AlertIcon, EyeIcon, EyeOffIcon, InfoIcon } from "./icons";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, initialAuthState);
  const [visible, setVisible] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
  }, [state]);

  const canSubmit = Boolean(token);

  return (
    <form action={action} noValidate className="mt-8">
      <input type="hidden" name="token" value={token} />
      {state.status !== "idle" && state.message && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role={state.status === "error" ? "alert" : "status"}
          className={`mb-6 flex gap-3 rounded-lg border p-3 text-sm leading-relaxed ${
            state.status === "error"
              ? "border-nt-danger/40 bg-nt-danger/10 text-nt-ink"
              : "border-nt-success/40 bg-nt-success/10 text-nt-ink"
          }`}
        >
          {state.status === "error" ? (
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-nt-danger" />
          ) : (
            <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-nt-success" />
          )}
          <p>{state.message}</p>
        </div>
      )}

      <label htmlFor="password" className="mb-2 block text-sm font-medium text-nt-ink">
        New password
      </label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          maxLength={200}
          aria-invalid={Boolean(state.errors?.password)}
          aria-describedby={state.errors?.password ? "password-error" : "password-hint"}
          className={`h-11 w-full rounded-lg border bg-nt-raised px-3 pr-12 text-sm text-nt-ink focus:border-nt-cyan focus:outline-none ${
            state.errors?.password ? "border-nt-danger" : "border-nt-line"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-nt-muted hover:text-nt-ink"
        >
          {visible ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
        </button>
      </div>
      {state.errors?.password ? (
        <p id="password-error" className="mt-2 text-xs text-nt-danger">{state.errors.password}</p>
      ) : (
        <p id="password-hint" className="mt-2 text-xs text-nt-muted">
          At least 8 characters, with a letter and a number.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="mt-8 h-12 w-full rounded-lg bg-nt-cyan font-display text-sm font-semibold text-nt-on-neon transition-colors hover:bg-[#5ceeff] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update password"}
      </button>

      <p className="mt-8 text-sm text-nt-muted">
        <Link href="/login" className="text-nt-cyan underline-offset-4 hover:underline">Back to sign in</Link>
      </p>
    </form>
  );
}
