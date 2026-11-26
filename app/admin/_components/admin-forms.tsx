"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { savePlan, savePlatformBilling } from "../actions";
import { initialActionState, type ActionState } from "./form-types";

type PlanValues = {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  maxProducts: number;
  maxMessages: number;
  maxSessions: number;
  tokenCap: number;
  graceDays: number;
  isActive: boolean;
};

const inputClass =
  "h-10 w-full rounded-lg border border-nt-line bg-nt-raised px-3 text-sm text-nt-ink placeholder:text-nt-muted/70 focus:border-nt-cyan focus:outline-none";

function Feedback({ state, summaryRef }: { state: ActionState; summaryRef: RefObject<HTMLDivElement | null> }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role={isError ? "alert" : "status"}
      className={`mb-4 rounded-lg border p-3 text-sm ${
        isError ? "border-nt-danger/40 bg-nt-danger/10 text-nt-ink" : "border-nt-success/40 bg-nt-success/10 text-nt-ink"
      }`}
    >
      <p className="font-medium">{state.message}</p>
      {state.errors && Object.keys(state.errors).length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {Object.entries(state.errors).map(([field, message]) => (
            <li key={field}>
              <a href={`#${field}`} className="text-nt-cyan underline-offset-2 hover:underline">
                {message}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-nt-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[0.7rem] text-nt-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-[0.7rem] text-nt-danger">{error}</p>}
    </div>
  );
}

export function PlanForm({ plan }: { plan?: PlanValues }) {
  const [state, action, pending] = useActionState(savePlan, initialActionState);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
  }, [state]);

  const error = (key: string) => state.errors?.[key];
  const described = (key: string) => (error(key) ? `${key}-error` : undefined);
  const invalid = (key: string) => Boolean(error(key));

  return (
    <form action={action} noValidate className="mt-5">
      <Feedback state={state} summaryRef={summaryRef} />
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="code" label="Code" error={error("code")} hint="Uppercase, e.g. GROWTH">
          <input id="code" name="code" defaultValue={plan?.code ?? ""} maxLength={20} aria-invalid={invalid("code")} aria-describedby={described("code")} className={inputClass} placeholder="GROWTH" />
        </Field>
        <Field id="name" label="Name" error={error("name")}>
          <input id="name" name="name" defaultValue={plan?.name ?? ""} maxLength={60} aria-invalid={invalid("name")} aria-describedby={described("name")} className={inputClass} placeholder="Growth" />
        </Field>
        <Field id="priceMonthly" label="Price / month (cents)" error={error("priceMonthly")}>
          <input id="priceMonthly" name="priceMonthly" type="number" min={0} defaultValue={plan?.priceMonthly ?? 0} aria-invalid={invalid("priceMonthly")} aria-describedby={described("priceMonthly")} className={inputClass} />
        </Field>
        <Field id="graceDays" label="Grace days" error={error("graceDays")}>
          <input id="graceDays" name="graceDays" type="number" min={0} defaultValue={plan?.graceDays ?? 7} aria-invalid={invalid("graceDays")} aria-describedby={described("graceDays")} className={inputClass} />
        </Field>
        <Field id="maxProducts" label="Max products" error={error("maxProducts")}>
          <input id="maxProducts" name="maxProducts" type="number" min={0} defaultValue={plan?.maxProducts ?? 50} aria-invalid={invalid("maxProducts")} aria-describedby={described("maxProducts")} className={inputClass} />
        </Field>
        <Field id="maxMessages" label="Messages / month" error={error("maxMessages")}>
          <input id="maxMessages" name="maxMessages" type="number" min={0} defaultValue={plan?.maxMessages ?? 1000} aria-invalid={invalid("maxMessages")} aria-describedby={described("maxMessages")} className={inputClass} />
        </Field>
        <Field id="maxSessions" label="WhatsApp sessions" error={error("maxSessions")}>
          <input id="maxSessions" name="maxSessions" type="number" min={0} defaultValue={plan?.maxSessions ?? 1} aria-invalid={invalid("maxSessions")} aria-describedby={described("maxSessions")} className={inputClass} />
        </Field>
        <Field id="tokenCap" label="LLM token cap" error={error("tokenCap")}>
          <input id="tokenCap" name="tokenCap" type="number" min={0} defaultValue={plan?.tokenCap ?? 500000} aria-invalid={invalid("tokenCap")} aria-describedby={described("tokenCap")} className={inputClass} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-nt-muted">
          <input type="checkbox" name="isActive" defaultChecked={plan?.isActive ?? true} className="h-4 w-4 accent-nt-cyan" />
          Plan available to shops
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-10 cursor-pointer rounded-lg bg-nt-cyan px-5 font-display text-xs font-semibold text-nt-on-neon transition-colors hover:bg-[#5ceeff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : plan ? "Save changes" : "Create plan"}
        </button>
      </div>
    </form>
  );
}

export function BillingForm() {
  const [state, action, pending] = useActionState(savePlatformBilling, initialActionState);
  const [provider, setProvider] = useState<"PAYHERO" | "DARAJA">("PAYHERO");
  const [showSecrets, setShowSecrets] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
  }, [state]);

  const error = (key: string) => state.errors?.[key];
  const described = (key: string) => (error(key) ? `${key}-error` : undefined);
  const invalid = (key: string) => Boolean(error(key));
  const inputType = showSecrets ? "text" : "password";
  const isDaraja = provider === "DARAJA";

  return (
    <form action={action} noValidate className="mt-5">
      <Feedback state={state} summaryRef={summaryRef} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="provider" label="Provider" error={error("provider")} hint="Receives owner subscription payments">
          <select
            id="provider"
            name="provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as "PAYHERO" | "DARAJA")}
            aria-invalid={invalid("provider")}
            aria-describedby={described("provider")}
            className={inputClass}
          >
            <option value="PAYHERO">PayHero</option>
            <option value="DARAJA">Daraja / M-Pesa</option>
          </select>
        </Field>
        <Field id="webhookSecret" label="Webhook secret (optional)" error={error("webhookSecret")} hint="Used to verify callbacks">
          <input id="webhookSecret" name="webhookSecret" type={inputType} autoComplete="off" aria-invalid={invalid("webhookSecret")} aria-describedby={described("webhookSecret")} className={inputClass} />
        </Field>
        <Field id="apiKey" label={isDaraja ? "Consumer key" : "API key"} error={error("apiKey")}>
          <input id="apiKey" name="apiKey" type={inputType} autoComplete="off" aria-invalid={invalid("apiKey")} aria-describedby={described("apiKey")} className={inputClass} />
        </Field>
        <Field id="apiSecret" label={isDaraja ? "Consumer secret" : "API secret"} error={error("apiSecret")}>
          <input id="apiSecret" name="apiSecret" type={inputType} autoComplete="off" aria-invalid={invalid("apiSecret")} aria-describedby={described("apiSecret")} className={inputClass} />
        </Field>
        {isDaraja && (
          <>
            <Field id="shortcode" label="M-Pesa shortcode" error={error("shortcode")}>
              <input id="shortcode" name="shortcode" inputMode="numeric" aria-invalid={invalid("shortcode")} aria-describedby={described("shortcode")} className={inputClass} />
            </Field>
            <Field id="passkey" label="Daraja passkey" error={error("passkey")}>
              <input id="passkey" name="passkey" type={inputType} autoComplete="off" aria-invalid={invalid("passkey")} aria-describedby={described("passkey")} className={inputClass} />
            </Field>
            <Field id="environment" label="Environment" error={error("environment")}>
              <select id="environment" name="environment" defaultValue="sandbox" className={inputClass}>
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </Field>
          </>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-nt-muted">
          <input type="checkbox" checked={showSecrets} onChange={(event) => setShowSecrets(event.target.checked)} className="h-4 w-4 accent-nt-cyan" />
          Show entered secrets
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-10 cursor-pointer rounded-lg bg-nt-cyan px-5 font-display text-xs font-semibold text-nt-on-neon transition-colors hover:bg-[#5ceeff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Encrypting…" : "Encrypt and save"}
        </button>
      </div>
    </form>
  );
}
