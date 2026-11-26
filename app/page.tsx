import Link from "next/link";
import {
  CardIcon,
  CheckIcon,
  ConversationDemo,
  LockIcon,
  PhoneIcon,
  Wordmark,
} from "./_components/landing/landing-parts";

const steps = [
  {
    icon: PhoneIcon,
    title: "Connect a number",
    body: "Link a WhatsApp business number from the dashboard. The session stays in its own worker.",
  },
  {
    icon: CardIcon,
    title: "Add your catalogue",
    body: "List products, variants and services. Prices and totals always come from your database.",
  },
  {
    icon: CheckIcon,
    title: "Get paid to your account",
    body: "The agent confirms the phone number, requests payment, and marks orders paid on callback.",
  },
];

const guardrails = [
  "Shop and customer are attached by the server, never guessed by the model.",
  "One pending payment prompt per customer, only after phone confirmation.",
  "A per-shop order cap keeps a single conversation within limits.",
  "Only a PayHero or Daraja callback can mark an order paid.",
];

const planRows = [
  { label: "Products", values: ["50", "500", "5,000"] },
  { label: "Messages per month", values: ["1,000", "10,000", "100,000"] },
  { label: "WhatsApp sessions", values: ["1", "3", "10"] },
  { label: "LLM token cap", values: ["500k", "4m", "20m"] },
  { label: "Lapsed subscription grace", values: ["7 days", "7 days", "7 days"] },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-nt-void text-nt-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-nt-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-nt-on-neon"
      >
        Skip to content
      </a>

      <header className="border-b border-nt-line/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Wordmark />
          <nav aria-label="Main" className="flex items-center gap-5 text-sm">
            <Link href="#how-it-works" className="hidden text-nt-muted transition-colors hover:text-nt-ink sm:inline">
              How it works
            </Link>
            <Link href="#plans" className="hidden text-nt-muted transition-colors hover:text-nt-ink sm:inline">
              Plans
            </Link>
            <Link href="/login" className="hidden text-nt-muted transition-colors hover:text-nt-ink sm:inline">
              Sign in
            </Link>
            <Link
              href="/register"
              className="whitespace-nowrap rounded-lg border border-nt-cyan/50 px-4 py-2 font-medium text-nt-cyan transition-colors hover:bg-nt-cyan/10"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-24">
          <div className="nt-reveal">
            <h1 className="text-pretty font-display text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-[3.6rem]">
              Your shop answers every WhatsApp customer.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-nt-muted sm:text-lg">
              Connect a number, add your products, and let the AI agent handle questions and orders. Payments land in your own PayHero or Daraja account.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-nt-cyan px-6 py-3 font-display text-sm font-semibold text-nt-on-neon transition-colors hover:bg-[#5ceeff]"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-nt-line px-6 py-3 text-sm font-medium text-nt-ink transition-colors hover:border-nt-cyan/50 hover:bg-nt-raised"
              >
                Sign in
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ConversationDemo />
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-y border-nt-line/70 bg-nt-surface/30">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-16">
            <h2 className="text-pretty font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              From first message to receipt
            </h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
              {steps.map((step, index) => (
                <li key={step.title} className="min-w-0 border-t border-nt-line pt-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-nt-cyan/30 bg-nt-cyan/10 text-nt-cyan">
                      <step.icon className="h-4 w-4" />
                    </span>
                    <span className="font-display text-sm text-nt-muted">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-medium text-nt-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-nt-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-28">
          <div>
            <h2 className="text-pretty font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              You keep control of the money.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-nt-muted">
              The agent sells within the rules you set. Nothing is marked paid until the payment provider confirms it.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-nt-cyan underline-offset-4 hover:underline"
            >
              Set up your shop
            </Link>
          </div>
          <ul className="divide-y divide-nt-line/70 border-y border-nt-line/70">
            {guardrails.map((item) => (
              <li key={item} className="flex items-start gap-4 py-5">
                <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-nt-cyan" />
                <span className="text-sm leading-relaxed text-nt-ink">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="plans" className="scroll-mt-24 border-y border-nt-line/70 bg-nt-surface/30">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
            <h2 className="text-pretty font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Plans with limits you can see
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nt-muted">
              Each plan caps products, messages and LLM tokens so one shop cannot exhaust the platform.
            </p>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">Plan limits for Starter, Growth and Scale</caption>
                <thead className="text-xs tracking-wide text-nt-muted">
                  <tr className="border-b border-nt-line">
                    <th scope="col" className="py-3 pr-4 font-medium">Limit</th>
                    <th scope="col" className="py-3 pr-4 font-medium">Starter</th>
                    <th scope="col" className="py-3 pr-4 font-medium">Growth</th>
                    <th scope="col" className="py-3 font-medium">Scale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nt-line/60">
                  {planRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row" className="py-3 pr-4 font-normal text-nt-muted">{row.label}</th>
                      {row.values.map((value, index) => (
                        <td key={`${row.label}-${index}`} className="tabular-nums py-3 pr-4 text-nt-ink">{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="relative overflow-hidden rounded-xl border border-nt-line bg-nt-surface px-6 py-12 sm:px-12 lg:px-16">
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(55% 80% at 85% 20%, color-mix(in oklab, var(--nt-magenta) 14%, transparent), transparent 70%), radial-gradient(50% 80% at 10% 100%, color-mix(in oklab, var(--nt-cyan) 12%, transparent), transparent 70%)",
              }}
            />
            <div className="relative z-10 flex flex-wrap items-end justify-between gap-8">
              <div>
                <h2 className="text-pretty font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                  Put your shop on WhatsApp.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-nt-muted">
                  Create an account to connect a number and add your first products.
                </p>
              </div>
              <Link
                href="/register"
                className="rounded-lg bg-nt-cyan px-6 py-3 font-display text-sm font-semibold text-nt-on-neon transition-colors hover:bg-[#5ceeff]"
              >
                Create account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-nt-line/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
          <Wordmark />
          <p className="text-xs text-nt-muted">WhatsApp sales agent for shops.</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-nt-muted">
            <Link href="/login" className="transition-colors hover:text-nt-ink">Sign in</Link>
            <Link href="/register" className="transition-colors hover:text-nt-ink">Create account</Link>
            <Link href="/terms" className="transition-colors hover:text-nt-ink">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-nt-ink">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
