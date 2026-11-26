import type { ReactNode, SVGProps } from "react";

const line = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

export function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-2 font-display text-lg font-semibold tracking-[0.08em] text-nt-ink">
      SMART<span className="text-nt-cyan">BUDGET</span>
      <span className="h-1.5 w-1.5 rounded-full bg-nt-magenta shadow-[0_0_10px_var(--nt-magenta)]" />
    </span>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...line} {...props}>
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...line} {...props}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...line} {...props}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

export function CardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...line} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
    </svg>
  );
}

function Message({ from, children }: { from: "customer" | "agent"; children: ReactNode }) {
  const isAgent = from === "agent";
  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
      <p
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isAgent
            ? "border border-nt-line bg-nt-raised text-nt-ink"
            : "bg-nt-cyan/15 text-nt-ink"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

/** Synthetic demonstration data, labeled as such in the UI. */
export function ConversationDemo() {
  return (
    <div className="relative w-full max-w-[30rem]">
      <div
        className="pointer-events-none absolute -inset-10 -z-10"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(45% 45% at 75% 20%, color-mix(in oklab, var(--nt-magenta) 12%, transparent), transparent 72%), radial-gradient(50% 45% at 12% 80%, color-mix(in oklab, var(--nt-cyan) 12%, transparent), transparent 72%)",
        }}
      />
      <div className="rounded-xl border border-nt-line bg-nt-surface p-5">
        <div className="flex items-center gap-3 border-b border-nt-line pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-nt-cyan/15 text-nt-cyan">
            <PhoneIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-nt-ink">Demo Shop</p>
            <p className="text-xs text-nt-muted">WhatsApp conversation</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-[0.7rem] text-nt-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-nt-success" />
            Agent online
          </span>
        </div>

        <div role="group" aria-label="Example conversation" className="space-y-3 py-5">
          <Message from="customer">Do you have these in size 42?</Message>
          <Message from="agent">Yes, 3 left. KSh 4,500. Want me to reserve one?</Message>
          <Message from="customer">Yes please</Message>
          <Message from="agent">Confirm your phone to receive the payment prompt.</Message>
          <div className="flex items-center justify-center gap-2 rounded-lg border border-nt-success/30 bg-nt-success/10 px-3 py-2 text-xs text-nt-ink">
            <CheckIcon className="h-4 w-4 text-nt-success" />
            Payment confirmed by callback · receipt sent
          </div>
        </div>

        <p className="border-t border-nt-line pt-3 text-[0.7rem] text-nt-muted">
          Illustrative conversation — not live shop data.
        </p>
      </div>
    </div>
  );
}
