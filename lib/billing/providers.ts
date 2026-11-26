import "server-only";

export type PlatformProvider = "PAYHERO" | "DARAJA";

export type PlatformCredentialPayload = {
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  channelId?: number;
  shortcode?: string;
  passkey?: string;
  environment?: "sandbox" | "production";
};

export type StkRequest = {
  amount: number;
  phone: string;
  reference: string;
  callbackUrl: string;
  customerName?: string | null;
};

export type StkStartResult = { providerRef: string; raw: unknown };
export type StkQueryResult = { status: "PENDING" | "SUCCESS" | "FAILED"; raw: unknown };
export type StkCallbackResult = {
  status: "SUCCESS" | "FAILED";
  providerRef: string | null;
  externalReference: string | null;
  amount: number | null;
  raw: unknown;
};

export type StkProvider = {
  start(payload: PlatformCredentialPayload, request: StkRequest): Promise<StkStartResult>;
  query(payload: PlatformCredentialPayload, providerRef: string): Promise<StkQueryResult>;
  parseCallback(body: unknown): StkCallbackResult;
};

function basic(apiKey: string, apiSecret: string) {
  return Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function firstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body = await response.text();
  try {
    return asObject(JSON.parse(body));
  } catch {
    return {};
  }
}

function queryStatus(value: unknown): "PENDING" | "SUCCESS" | "FAILED" {
  if (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) {
    const code = Number(value);
    if (code === 0) return "SUCCESS";
    if (code === 1) return "PENDING";
    return "FAILED";
  }
  const status = String(value ?? "").toUpperCase();
  if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "COMPLETE", "PAID"].some((item) => status.includes(item))) {
    return "SUCCESS";
  }
  if (["FAILED", "FAILURE", "CANCELLED", "CANCELED", "REVERSED"].some((item) => status.includes(item))) {
    return "FAILED";
  }
  return "PENDING";
}

// Pay Hero: https://docs.payhero.co.ke
const PAYHERO_BASE = "https://backend.payhero.co.ke/api/v2";

function payheroAuth(payload: PlatformCredentialPayload) {
  return `Basic ${basic(payload.apiKey, payload.apiSecret)}`;
}

const payhero: StkProvider = {
  async start(payload, request) {
    if (!payload.channelId) {
      throw new Error("PayHero channel ID is missing. Add it in Superadmin → Billing.");
    }
    const response = await fetch(`${PAYHERO_BASE}/payments`, {
      method: "POST",
      headers: { Authorization: payheroAuth(payload), "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: request.amount,
        phone_number: `0${request.phone.slice(3)}`,
        channel_id: payload.channelId,
        provider: "m-pesa",
        external_reference: request.reference,
        customer_name: request.customerName ?? undefined,
        callback_url: request.callbackUrl,
      }),
      cache: "no-store",
    });
    const data = await readJson(response);
    const providerRef = firstString(data, ["reference", "providerReference"]);
    if (!response.ok || data.success !== true || !providerRef) {
      throw new Error(`PayHero rejected the STK request (${response.status}).`);
    }
    return { providerRef, raw: data };
  },

  async query(payload, providerRef) {
    const url = new URL(`${PAYHERO_BASE}/transaction-status`);
    url.searchParams.set("reference", providerRef);
    const response = await fetch(url, {
      headers: { Authorization: payheroAuth(payload), "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await readJson(response);
    const nested = asObject(data.data);
    const transaction = asObject(data.transaction);
    const status = queryStatus(
      firstString(data, ["status"]) ??
        firstString(nested, ["status"]) ??
        firstString(transaction, ["status"]),
    );
    if (response.ok && status !== "PENDING") return { status, raw: data };
    if (!response.ok || data.success === false) return { status: "FAILED", raw: data };
    return { status: "PENDING", raw: data };
  },

  parseCallback(body) {
    const envelope = asObject(body);
    const response = asObject(envelope.response);
    const source = Object.keys(response).length > 0 ? response : envelope;
    const resultCode = Number(source.ResultCode ?? source.resultCode ?? -1);
    const statusText = firstString(source, ["Status", "status"]);
    const paymentSuccess = source.paymentSuccess === true || source.status === true;
    const success = resultCode === 0 || String(statusText).toLowerCase() === "success" || paymentSuccess;
    return {
      status: success ? "SUCCESS" : "FAILED",
      providerRef: firstString(source, ["CheckoutRequestID", "providerReference", "reference", "Reference"]),
      externalReference: firstString(source, [
        "ExternalReference",
        "external_reference",
        "user_reference",
        "UserReference",
      ]),
      amount: firstNumber(source, ["Amount", "amount"]),
      raw: body,
    };
  },
};

// Daraja (M-Pesa Express): https://developer.safaricom.co.ke
function darajaBase(payload: PlatformCredentialPayload) {
  return payload.environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function nairobiTimestamp() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}${value("month")}${value("day")}${value("hour")}${value("minute")}${value("second")}`;
}

function darajaPassword(payload: PlatformCredentialPayload, timestamp: string) {
  return Buffer.from(`${payload.shortcode}${payload.passkey}${timestamp}`).toString("base64");
}

async function darajaToken(payload: PlatformCredentialPayload) {
  const response = await fetch(
    `${darajaBase(payload)}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${basic(payload.apiKey, payload.apiSecret)}` }, cache: "no-store" },
  );
  const data = await readJson(response);
  const token = firstString(data, ["access_token"]);
  if (!response.ok || !token) {
    throw new Error(`Daraja rejected the credentials (${response.status}).`);
  }
  return token;
}

const daraja: StkProvider = {
  async start(payload, request) {
    if (!payload.shortcode || !payload.passkey) {
      throw new Error("Daraja shortcode or passkey is missing. Add them in Superadmin → Billing.");
    }
    const timestamp = nairobiTimestamp();
    const token = await darajaToken(payload);
    const response = await fetch(`${darajaBase(payload)}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: Number(payload.shortcode),
        Password: darajaPassword(payload, timestamp),
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: request.amount,
        PartyA: request.phone,
        PartyB: Number(payload.shortcode),
        PhoneNumber: request.phone,
        CallBackURL: request.callbackUrl,
        AccountReference: request.reference.slice(0, 12),
        TransactionDesc: "SmartBudget",
      }),
      cache: "no-store",
    });
    const data = await readJson(response);
    const providerRef = firstString(data, ["CheckoutRequestID"]);
    if (!response.ok || String(data.ResponseCode ?? "") !== "0" || !providerRef) {
      throw new Error(`Daraja rejected the STK request (${String(data.ResponseDescription ?? response.status)}).`);
    }
    return { providerRef, raw: data };
  },

  async query(payload, providerRef) {
    if (!payload.shortcode || !payload.passkey) return { status: "PENDING", raw: null };
    const timestamp = nairobiTimestamp();
    const token = await darajaToken(payload);
    const response = await fetch(`${darajaBase(payload)}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: Number(payload.shortcode),
        Password: darajaPassword(payload, timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: providerRef,
      }),
      cache: "no-store",
    });
    const data = await readJson(response);
    const status = queryStatus(data.ResultCode);
    if (status !== "PENDING") return { status, raw: data };
    return { status: "PENDING", raw: data };
  },

  parseCallback(body) {
    const envelope = asObject(body);
    const callback = asObject(asObject(envelope.Body).stkCallback);
    const resultCode = Number(callback.ResultCode ?? -1);
    let providerRef = firstString(callback, ["CheckoutRequestID"]);
    if (!providerRef) {
      const nested = asObject(asObject(body).Body);
      providerRef = firstString(nested, ["CheckoutRequestID"]);
    }
    let amount: number | null = null;
    const metadata = asObject(callback.CallbackMetadata);
    if (Array.isArray(metadata.Item)) {
      for (const raw of metadata.Item) {
        const item = asObject(raw);
        if (item.Name === "Amount") {
          const parsed = typeof item.Value === "number" ? item.Value : Number(item.Value);
          if (Number.isFinite(parsed)) amount = parsed;
        }
      }
    }
    return {
      status: resultCode === 0 ? "SUCCESS" : "FAILED",
      providerRef,
      externalReference: firstString(callback, ["AccountReference"]),
      amount,
      raw: body,
    };
  },
};

export const stkProviders: Record<PlatformProvider, StkProvider> = { PAYHERO: payhero, DARAJA: daraja };
