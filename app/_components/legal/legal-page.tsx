import Link from "next/link";
import { Wordmark } from "@/app/_components/landing/landing-parts";

export const LEGAL_EMAIL = "support@smartbudget.app";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  paragraphsAfterBullets?: string[];
};

type LegalPageProps = {
  title: string;
  description: string;
  lastUpdated: string;
  lastUpdatedIso: string;
  sections: LegalSection[];
};

export function LegalPage({
  title,
  description,
  lastUpdated,
  lastUpdatedIso,
  sections,
}: LegalPageProps) {
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
          <Link href="/" aria-label="Smart Budget home">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-5 text-sm">
            <Link href="/#plans" className="hidden text-nt-muted transition-colors hover:text-nt-ink sm:inline">
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
        <div className="relative overflow-hidden border-b border-nt-line/70">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(50% 90% at 88% 10%, color-mix(in oklab, var(--nt-magenta) 12%, transparent), transparent 70%), radial-gradient(45% 80% at 6% 90%, color-mix(in oklab, var(--nt-cyan) 10%, transparent), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
            <h1 className="text-pretty font-display text-[2.4rem] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-nt-muted sm:text-lg">
              {description}
            </p>
            <p className="mt-7 text-xs text-nt-muted">
              Last updated <time dateTime={lastUpdatedIso}>{lastUpdated}</time>
            </p>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 lg:py-20">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <nav aria-label="On this page">
              <p className="font-display text-sm font-medium text-nt-ink">On this page</p>
              <ul className="mt-4 space-y-1 border-l border-nt-line">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="-ml-px block border-l border-transparent py-2 pl-4 text-sm text-nt-muted transition-colors hover:border-nt-cyan hover:text-nt-ink"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-8 rounded-lg border border-nt-line bg-nt-surface p-4">
              <p className="text-sm font-medium text-nt-ink">Questions?</p>
              <p className="mt-2 text-xs leading-relaxed text-nt-muted">
                Email Smart Budget at{" "}
                <a href={`mailto:${LEGAL_EMAIL}`} className="break-all text-nt-cyan underline-offset-4 hover:underline">
                  {LEGAL_EMAIL}
                </a>
                .
              </p>
            </div>
          </aside>

          <article className="min-w-0 max-w-prose">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 border-t border-nt-line py-10 first:border-t-0 first:pt-0"
              >
                <h2 className="text-pretty font-display text-2xl font-semibold tracking-[-0.02em]">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-nt-muted sm:text-base">
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets && (
                    <ul className="space-y-3">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3">
                          <span
                            aria-hidden="true"
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-nt-cyan"
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.paragraphsAfterBullets?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>

      <footer className="border-t border-nt-line/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-8 sm:px-8">
          <Link href="/" aria-label="Smart Budget home">
            <Wordmark />
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-nt-muted">
            <Link href="/" className="transition-colors hover:text-nt-ink">Home</Link>
            <Link href="/terms" className="transition-colors hover:text-nt-ink">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-nt-ink">Privacy</Link>
            <Link href="/login" className="transition-colors hover:text-nt-ink">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
