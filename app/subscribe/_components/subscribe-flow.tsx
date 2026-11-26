"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type RefObject } from "react";
import { money } from "@/lib/format";
import { choosePlan, startSubscriptionPayment } from "../actions";
import { initialSubscribeState, type SelectedPlan, type SubscribeState } from "./form-types";

export type PlanView = SelectedPlan & {
  maxProducts: number;
  maxMessages: number;
  maxSessions: number;
  tokenCap: number;
  graceDays: number;
};

export type EntitlementView = {
  status: string;
  planName: string;
  planCode: string;
  endsAt: string;
  daysLeft: number;
  isTrial: boolean;
};

type Props = {
  plans: PlanView[];
  entitlement: EntitlementView | null;
  canTrial: boolean;
  initialPlan: SelectedPlan | null;
};

const inputClass =
  "h-11 w-full rounded-lg border border-nt-line bg-nt-raised px-3 text-sm text-nt-ink placeholder:text-nt-muted/70 focus:border-nt-cyan focus:outline-none";

function Feedback({ state, summaryRef }: { state: SubscribeState; summaryRef: RefObject<HTMLDivElement | null> }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role={isError ? "alert" : "status"}
      className={`mb-5 rounded-lg border p-4 text-sm ${
        isError ? "border-nt-danger/40 bg-nt-danger/10 text-nt-ink" : "border-nt-success/40 bg-nt-success/10 text-nt-ink"
      }`}
    >
      <p className="font-medium">{state.message}</p>
      {state.errors && Object.keys(state.errors).length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {Object.entries(state.errors).map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SubscribeFlow({ plans, entitlement, canTrial, initialPlan }: Props) {
  const router = useRouter();
  const chooseRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const [chooseState, chooseAction, choosePending] = useActionState(choosePlan, initialSubscribeState);
  const [paymentState, paymentAction, paymentPending] = useActionState(
    startSubscriptionPayment,
    initialSubscribeState,
  );
  const [planCleared, setPlanCleared] = useState(false);
  const [paymentCleared, setPaymentCleared] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const selectedPlan = planCleared
    ? null
    : paymentState.selectedPlan ?? chooseState.selectedPlan ?? initialPlan;
  const paymentId = paymentCleared ? null : paymentState.paymentId ?? null;

  useEffect(() => {
    if (chooseState.status === "error") chooseRef.current?.focus();
  }, [chooseState]);

  useEffect(() => {
    if (paymentState.status === "error") paymentRef.current?.focus();
  }, [paymentState]);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/billing/payment-status?paymentId=${encodeURIComponent(paymentId)}`, {
          headers: { "X-SmartBudget": "1" },
          cache: "no-store",
        });
        const body = (await response.json()) as { status?: string; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not check the payment");
        if (body.status === "PAID") {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
        if (body.status === "FAILED") {
          setPollError("M-Pesa declined or cancelled that prompt. You can send a new one.");
          setPaymentCleared(true);
          return;
        }
      } catch (cause) {
        if (!cancelled) setPollError(cause instanceof Error ? cause.message : "Could not check the payment");
      }
      if (!cancelled && attempts++ < 40) timer = window.setTimeout(poll, 3000);
    };

    timer = window.setTimeout(poll, 2500);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [paymentId, router]);

  const waiting = Boolean(paymentId);

  return (
    <div className="mt-10">
      {entitlement ? (
        <section
          aria-label="Current plan"
          className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-nt-cyan/30 bg-nt-cyan/5 px-5 py-4"
        >
          <div>
            <p className="text-sm font-medium text-nt-ink" role="status">
              {entitlement.isTrial ? `${entitlement.planName} free trial is active` : `${entitlement.planName} is active`}
            </p>
            <p className="mt-1 text-xs text-nt-muted">
              {entitlement.isTrial
                ? `${entitlement.daysLeft} day${entitlement.daysLeft === 1 ? "" : "s"} left before the dashboard locks.`
                : "Your dashboard and WhatsApp stay unlocked while this plan is active."}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-nt-line px-4 py-2 text-sm text-nt-muted transition-colors hover:border-nt-cyan/50 hover:text-nt-ink"
          >
            Back to dashboard
          </Link>
        </section>
      ) : (
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-nt-muted" role="status">
          Choose a plan to unlock the dashboard. A new shop gets a 14-day free trial; after that, an M-Pesa payment is
          required to continue.
        </p>
      )}

      {!selectedPlan ? (
        <>
          <div ref={chooseRef}>
            <Feedback state={chooseState} summaryRef={chooseRef} />
          </div>
          {plans.length === 0 ? (
            <p className="rounded-xl border border-nt-line bg-nt-surface p-6 text-sm text-nt-muted" role="status">
              No plans are available yet. Contact support.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <article key={plan.id} className="flex flex-col rounded-xl border border-nt-line bg-nt-surface p-5">
                  <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
                  <p className="mt-3 font-display text-2xl text-nt-cyan tabular-nums">
                    {money(plan.priceMonthly)}
                    <span className="ml-1 text-xs font-normal text-nt-muted">/ month</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-xs text-nt-muted">
                    <li>{plan.maxProducts.toLocaleString()} products</li>
                    <li>{plan.maxMessages.toLocaleString()} messages / month</li>
                    <li>{plan.maxSessions} WhatsApp session{plan.maxSessions === 1 ? "" : "s"}</li>
                    <li>{plan.tokenCap.toLocaleString()} LLM token cap</li>
                  </ul>
                  <form
                    action={chooseAction}
                    className="mt-6"
                    onSubmit={() => {
                      setPlanCleared(false);
                      setPaymentCleared(false);
                    }}
                  >
                    <input type="hidden" name="planId" value={plan.id} />
                    <button
                      type="submit"
                      disabled={choosePending}
                      className="h-10 w-full cursor-pointer rounded-lg bg-nt-cyan font-display text-xs font-semibold text-nt-on-neon transition-colors hover:bg-[#5ceeff] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {choosePending ? "Opening plan…" : canTrial ? "Start 14-day trial" : "Choose and pay"}
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <section className="max-w-xl rounded-xl border border-nt-line bg-nt-surface p-6" aria-labelledby="payment-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-nt-muted">Selected plan</p>
              <h2 id="payment-title" className="mt-1 font-display text-2xl font-semibold">
                {selectedPlan.name}
              </h2>
              <p className="mt-1 text-sm text-nt-muted">{money(selectedPlan.priceMonthly)} / month</p>
            </div>
            {!waiting && (
              <button
                type="button"
                onClick={() => {
                  setPlanCleared(true);
                  setPaymentCleared(true);
                  setPollError(null);
                }}
                className="cursor-pointer rounded-lg border border-nt-line px-3 py-2 text-xs text-nt-muted transition-colors hover:border-nt-cyan/50 hover:text-nt-ink"
              >
                Change plan
              </button>
            )}
          </div>

          <div ref={paymentRef}>
            <Feedback state={paymentState} summaryRef={paymentRef} />
          </div>
          {pollError && (
            <p role="alert" className="mb-4 rounded-lg border border-nt-danger/40 bg-nt-danger/10 p-3 text-sm">
              {pollError}
            </p>
          )}

          {waiting ? (
            <div role="status" aria-live="polite" className="rounded-lg border border-nt-cyan/30 bg-nt-cyan/5 p-4 text-sm">
              <p className="font-medium text-nt-ink">STK prompt sent.</p>
              <p className="mt-2 text-nt-muted">
                Enter your M-Pesa PIN on your phone. This page unlocks the dashboard automatically when payment is
                confirmed.
              </p>
            </div>
          ) : (
            <form
              action={paymentAction}
              className="mt-6"
              noValidate
              onSubmit={() => setPaymentCleared(false)}
            >
              <input type="hidden" name="planId" value={selectedPlan.id} />
              <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-nt-ink">
                M-Pesa phone number
              </label>
              <input
                id="phone"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0712345678"
                aria-invalid={Boolean(paymentState.errors?.phone)}
                aria-describedby={paymentState.errors?.phone ? "phone-error" : undefined}
                className={inputClass}
              />
              {paymentState.errors?.phone && (
                <p id="phone-error" className="mt-1 text-xs text-nt-danger">
                  {paymentState.errors.phone}
                </p>
              )}
              <button
                type="submit"
                disabled={paymentPending}
                className="mt-5 h-11 w-full cursor-pointer rounded-lg bg-nt-cyan font-display text-xs font-semibold text-nt-on-neon transition-colors hover:bg-[#5ceeff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paymentPending ? "Sending prompt…" : `Pay ${money(selectedPlan.priceMonthly)} with M-Pesa`}
              </button>
              <p className="mt-3 text-xs text-nt-muted">
                Payment is collected by the platform&apos;s PayHero or Daraja account. A signed callback activates your
                subscription.
              </p>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
