"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { ShopWaStatus } from "@/lib/openwa";

type Props = { shopId: string; initial: ShopWaStatus };

const labels: Record<string, string> = {
  DISCONNECTED: "Not connected",
  CONNECTING: "Waiting for scan",
  CONNECTED: "Connected",
  BANNED: "Restricted",
};

function tone(status: string) {
  if (status === "CONNECTED") return "border-nt-success/40 bg-nt-success/10 text-nt-success";
  if (status === "BANNED") return "border-nt-danger/40 bg-nt-danger/10 text-nt-danger";
  if (status === "CONNECTING") return "border-nt-cyan/40 bg-nt-cyan/10 text-nt-cyan";
  return "border-nt-line bg-nt-raised text-nt-muted";
}

export function WhatsAppPanel({ shopId, initial }: Props) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/shops/${shopId}/whatsapp/status`, { cache: "no-store" });
    const body = (await response.json()) as ShopWaStatus & { error?: string };
    if (!response.ok) throw new Error(body.error ?? "Could not refresh WhatsApp status");
    setState(body);
  }, [shopId]);

  useEffect(() => {
    if (state.status === "CONNECTED" || state.status === "BANNED" || !state.hasSession) return;
    const interval = window.setInterval(() => {
      refresh().catch((cause: Error) => setError(cause.message));
    }, 6000);
    return () => window.clearInterval(interval);
  }, [refresh, state.status, state.hasSession]);

  async function act(action: "connect" | "disconnect" | "forget") {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/shops/${shopId}/whatsapp/${action}`, {
        method: action === "forget" ? "DELETE" : "POST",
        headers: { "X-SmartBudget": "1" },
      });
      const body = (await response.json()) as ShopWaStatus & { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "WhatsApp action failed");
      if (action === "forget") setState({ ...initial, hasSession: false, status: "DISCONNECTED" });
      else setState(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "WhatsApp action failed");
    } finally {
      setBusy(null);
    }
  }

  const restriction = state.restriction ? parseRestriction(state.restriction) : null;

  return (
    <section className="rounded-xl border border-nt-line bg-nt-surface p-5 sm:p-6" aria-labelledby="whatsapp-panel-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="whatsapp-panel-title" className="font-display text-lg font-semibold">
            WhatsApp connection
          </h2>
          <p className="mt-1 max-w-xl text-sm text-nt-muted">
            This shop gets its own OpenWA session and API key. Your login stays encrypted in this platform&apos;s database.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tone(state.status)}`} role="status" aria-live="polite">
          {labels[state.status] ?? state.status.toLowerCase()}
        </span>
      </div>

      {state.qrCode && state.status !== "CONNECTED" ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-nt-line bg-nt-void p-5 sm:flex-row sm:items-start">
          <div className="shrink-0 rounded-lg bg-white p-2">
            <Image src={state.qrCode} alt="Scan this QR code with WhatsApp to connect this shop" width={188} height={188} unoptimized />
          </div>
          <div>
            <p className="font-medium text-nt-ink">Scan with the phone you use for this shop</p>
            <p className="mt-2 text-sm text-nt-muted">
              WhatsApp → Linked devices → Link a device. The code refreshes automatically while this screen is open.
            </p>
          </div>
        </div>
      ) : null}

      {state.status === "CONNECTED" ? (
        <p className="mt-5 text-sm text-nt-muted">
          {state.phoneNumber ? `Linked to ${state.phoneNumber}. ` : ""}
          Inbound messages are routed only to this shop.
        </p>
      ) : null}

      {state.status === "BANNED" ? (
        <p className="mt-5 rounded-lg border border-nt-danger/40 bg-nt-danger/10 px-4 py-3 text-sm text-nt-danger">
          {restriction
            ? `WhatsApp reported ${restriction.kind ?? "a restriction"}${restriction.code ? ` (${restriction.code})` : ""}. Resolve it on the phone, then reconnect.`
            : "WhatsApp restricted this number. Resolve it on the phone, then reconnect."}
        </p>
      ) : null}

      {state.lastError ? (
        <p className="mt-5 rounded-lg border border-nt-danger/40 bg-nt-danger/10 px-4 py-3 text-sm text-nt-danger">
          {state.lastError}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-5 rounded-lg border border-nt-danger/40 bg-nt-danger/10 px-4 py-3 text-sm text-nt-danger">
          <span aria-hidden="true">! </span>
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {!state.hasSession || state.status === "DISCONNECTED" || state.status === "BANNED" ? (
          <button
            type="button"
            onClick={() => act("connect")}
            disabled={busy !== null}
            className="cursor-pointer rounded-lg bg-nt-cyan px-4 py-2 text-sm font-semibold text-nt-on-neon transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "connect" ? "Connecting…" : state.hasSession ? "Reconnect WhatsApp" : "Connect WhatsApp"}
          </button>
        ) : null}
        {state.hasSession && state.status !== "BANNED" ? (
          <button
            type="button"
            onClick={() => act("disconnect")}
            disabled={busy !== null}
            className="cursor-pointer rounded-lg border border-nt-line px-4 py-2 text-sm text-nt-muted transition-colors hover:border-nt-cyan/50 hover:text-nt-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : null}
        {state.hasSession ? (
          <button
            type="button"
            onClick={() => act("forget")}
            disabled={busy !== null}
            className="cursor-pointer rounded-lg border border-nt-danger/40 px-4 py-2 text-sm text-nt-danger transition-colors hover:bg-nt-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "forget" ? "Removing…" : "Forget this number"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function parseRestriction(raw: string): { kind?: string; code?: string } | null {
  try {
    return JSON.parse(raw) as { kind?: string; code?: string };
  } catch {
    return null;
  }
}
