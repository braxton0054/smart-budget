const facts = [
  "Connect a WhatsApp number in minutes",
  "An AI agent answers product questions",
  "Payments land in your own account",
];

function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-2 font-display text-[1.35rem] font-semibold tracking-[0.08em] text-nt-ink">
      SMART<span className="text-nt-cyan">BUDGET</span>
      <span className="h-1.5 w-1.5 rounded-full bg-nt-magenta shadow-[0_0_10px_var(--nt-magenta)]" />
    </span>
  );
}

function Skyline() {
  return (
    <svg
      viewBox="0 0 620 720"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="nt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070A13" />
          <stop offset="58%" stopColor="#0E1424" />
          <stop offset="100%" stopColor="#070A13" />
        </linearGradient>
        <filter id="nt-bloom" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect width="620" height="720" fill="url(#nt-sky)" />

      {/* One neon disc, low and distant. */}
      <circle cx="452" cy="172" r="92" fill="none" stroke="var(--nt-magenta)" strokeOpacity="0.26" />
      <circle
        cx="452"
        cy="172"
        r="70"
        fill="none"
        stroke="var(--nt-magenta)"
        strokeOpacity="0.18"
        strokeWidth="14"
        filter="url(#nt-bloom)"
      />
      <circle cx="452" cy="172" r="70" fill="none" stroke="var(--nt-magenta)" strokeOpacity="0.5" />

      {/* Buildings: solid silhouettes with hairline edges. */}
      <g fill="#0B1120" stroke="var(--nt-cyan)" strokeOpacity="0.2">
        <rect x="-10" y="404" width="88" height="316" />
        <rect x="86" y="336" width="66" height="384" />
        <rect x="160" y="446" width="54" height="274" />
        <rect x="222" y="292" width="92" height="428" />
        <rect x="322" y="386" width="58" height="334" />
        <rect x="388" y="318" width="74" height="402" />
        <rect x="470" y="420" width="56" height="300" />
        <rect x="534" y="354" width="96" height="366" />
      </g>

      {/* Lit windows — sparse, so the neon reads as signage, not texture. */}
      <g fill="var(--nt-cyan)" fillOpacity="0.42">
        <rect x="104" y="364" width="8" height="14" />
        <rect x="124" y="364" width="8" height="14" />
        <rect x="104" y="398" width="8" height="14" />
        <rect x="244" y="324" width="9" height="16" />
        <rect x="268" y="324" width="9" height="16" />
        <rect x="244" y="360" width="9" height="16" />
        <rect x="292" y="360" width="9" height="16" />
        <rect x="408" y="348" width="8" height="14" />
        <rect x="432" y="382" width="8" height="14" />
        <rect x="556" y="384" width="9" height="15" />
        <rect x="580" y="418" width="9" height="15" />
      </g>
      <g fill="var(--nt-magenta)" fillOpacity="0.55">
        <rect x="124" y="432" width="8" height="14" />
        <rect x="268" y="396" width="9" height="16" />
        <rect x="408" y="420" width="8" height="14" />
        <rect x="556" y="452" width="9" height="15" />
      </g>

      {/* A single vertical neon sign — the memorable detail. */}
      <rect x="338" y="416" width="26" height="104" rx="2" fill="#0B1120" stroke="var(--nt-magenta)" strokeOpacity="0.75" />
      <rect x="344" y="426" width="14" height="3" fill="var(--nt-magenta)" fillOpacity="0.9" />
      <rect x="344" y="440" width="14" height="3" fill="var(--nt-magenta)" fillOpacity="0.9" />
      <rect x="344" y="454" width="14" height="3" fill="var(--nt-magenta)" fillOpacity="0.9" />
      <rect x="348" y="468" width="6" height="20" fill="var(--nt-cyan)" fillOpacity="0.85" />

      {/* Perspective ground grid. */}
      <g stroke="var(--nt-cyan)" strokeOpacity="0.16">
        {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={310 + i * 60} y1="700" x2={310 + i * 320} y2="920" />
        ))}
        {[716, 738, 766, 804, 856].map((y) => (
          <line key={y} x1="-200" y1={y} x2="820" y2={y} />
        ))}
      </g>
    </svg>
  );
}

export function BrandPanel() {
  return (
    <aside className="relative shrink-0 overflow-hidden border-b border-nt-line bg-nt-void lg:sticky lg:top-0 lg:h-dvh lg:w-[52%] lg:border-b-0 lg:border-r">
      {/* Compact brand strip on small screens. */}
      <div className="flex items-center justify-between px-5 py-4 lg:hidden">
        <Wordmark />
        <span className="font-display text-[0.65rem] tracking-[0.18em] text-nt-muted">SHOP OS</span>
      </div>

      {/* Full panel on desktop. */}
      <div className="relative hidden h-full lg:block">
        <Skyline />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(58% 48% at 22% 62%, color-mix(in oklab, var(--nt-void) 80%, transparent), transparent 78%), radial-gradient(46% 38% at 18% 8%, color-mix(in oklab, var(--nt-cyan) 12%, transparent), transparent 70%), radial-gradient(40% 34% at 88% 22%, color-mix(in oklab, var(--nt-magenta) 11%, transparent), transparent 72%)",
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between px-12 py-11 xl:px-16">
          <div className="nt-reveal">
            <Wordmark />
          </div>

          <div className="nt-reveal max-w-[30rem]" style={{ animationDelay: "90ms" }}>
            <p className="font-display text-[2.35rem] font-semibold leading-[1.14] tracking-[-0.02em] text-nt-ink xl:text-[2.8rem]">
              WhatsApp orders, answered by AI. Payments straight to your account.
            </p>
            <ul className="mt-10 space-y-4">
              {facts.map((fact) => (
                <li key={fact} className="flex items-start gap-3 text-sm text-nt-muted">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-nt-cyan shadow-[0_0_8px_var(--nt-cyan)]" />
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs tracking-wide text-nt-muted">Multi-shop sales agent · Built for shop owners</p>
        </div>
      </div>
    </aside>
  );
}
