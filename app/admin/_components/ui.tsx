import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-nt-line bg-nt-surface p-5">
      <p className="text-xs tracking-wide text-nt-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-semibold text-nt-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-nt-muted">{hint}</p>}
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-nt-line bg-nt-surface">
      <div className="border-b border-nt-line px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-nt-ink">{title}</h2>
        {description && <p className="mt-1 text-xs text-nt-muted">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ACTIVE" || status === "CONNECTED" || status === "PAID" || status === "DELIVERED"
      ? "border-nt-success/40 bg-nt-success/10 text-nt-success"
      : status === "TRIAL" || status === "PENDING" || status === "CONNECTING"
        ? "border-nt-cyan/40 bg-nt-cyan/10 text-nt-cyan"
        : "border-nt-line bg-nt-raised text-nt-muted";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-medium tracking-wide ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p role="status" className="py-10 text-center text-sm text-nt-muted">
      {message}
    </p>
  );
}
