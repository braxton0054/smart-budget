This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) for the public home page. It explains the product with an illustrative WhatsApp conversation and links to `/login` and `/register`.

## Environment

`.env.example` is the committed template; `.env` is gitignored and already contains locally generated `SESSION_SECRET`, `CREDENTIALS_ENCRYPTION_KEY` and `POSTGRES_PASSWORD` values. Fill in the remaining credentials in `.env`: `ZAI_API_KEY`/`ZAI_MODEL` for Z.AI, `OPENCODE_API_KEY`/`OPENCODE_MODEL` for OpenCode Go inference, plus Google OAuth and Resend. Run `npm run env:check` to validate syntax, required keys, provider authentication, the primary model plus comma-separated `ZAI_MODEL_FALLBACKS`/`OPENCODE_MODEL_FALLBACKS`, and a minimal request for each without printing secrets. A 402/429 response means the key is valid but has no available usage balance or free quota. Generate replacement secrets with `openssl rand -base64 32`.

Local services: `docker-compose.yml` runs PostgreSQL (`localhost:5433`), Redis (`localhost:6379`), the **OpenWA** WhatsApp gateway (`localhost:2785`, loopback only) and a `wa-state-sync` sidecar. `npm run dev` starts all four before the Next.js dev server. Run `npx prisma migrate deploy` and `npm run db:seed` once. The seed creates the superadmin from `SUPERADMIN_EMAIL`, three plans and one clearly-labeled demo shop. `GET /api/health` checks Postgres and Redis.

OpenWA is the cloned fork from `https://github.com/rmyndharis/OpenWA.git` in `wa-worker/`, run from a pinned published image. Its bootstrap admin key comes from `OPENWA_ADMIN_API_KEY` (`npm run openwa:key` reads the generated value on an existing volume). `OPENWA_API_KEY_PEPPER` must be set before the **first** boot; changing it later locks out existing keys. If the image cannot be pulled, `npm run openwa:pull` retries explicitly.

Each shop owns a separate OpenWA session. Connecting from the owner dashboard creates that session, mints a **session-scoped** OpenWA API key and a signed per-shop webhook, and stores both sealed with AES-256-GCM in `WaSession` — never in `.env`. `wa-state-sync` watches the shared Baileys auth directory and mirrors each session's credentials into Postgres as encrypted ciphertext, restoring them before OpenWA boots. Webhooks arrive at `/api/webhooks/openwa/<token>`, are verified against that shop's secret, update session status, and enqueue tenant-tagged jobs into `whatsapp-inbound`. The old `/api/webhooks/openwa` route still accepts a shared webhook signed with `OPENWA_WEBHOOK_SECRET`. OpenWA is an unofficial gateway — use a dedicated WhatsApp number and heed the ban-risk guidance in `wa-worker/README.md`.

Payment provider keys are **not** stored in `.env` — they are configured in the PayHero and Daraja dashboards and held per shop in the encrypted database. For local Google OAuth, register `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.

## Production stack

`npm run prod:up` builds and starts the complete self-hosted system:

- `web` — the Next.js standalone server on `${APP_PORT:-3000}`, the only published port
- `migrate` — runs `prisma migrate deploy` once before the web server starts
- `postgres`, `redis` — internal-only, no host ports
- `wa-state-sync` — restores encrypted Baileys state before OpenWA boots
- `openwa` — pinned `ghcr.io/rmyndharis/openwa:0.32.1`, internal-only, health-checked and required by `web`

The web container waits for Postgres, Redis, a successful migration, the state sidecar (through OpenWA) and an OpenWA readiness check. `restart: unless-stopped` keeps the whole stack available after crashes and reboots; enable the Docker daemon on boot on the host. OpenWA receives webhooks at `OPENWA_PRODUCTION_CALLBACK_URL` (`http://web:3000` by default) and `OPENWA_SSRF_ALLOWED_HOSTS` allows that internal hostname. Keep `APP_URL`/`NEXT_PUBLIC_APP_URL` as the public HTTPS origin because OAuth redirects use them.

Use `npm run prod:ps`, `npm run prod:logs` and `npm run prod:down` to operate the stack. The production image is non-root and built with `output: "standalone"`.

## Legal pages

Public legal routes are `/terms` and `/privacy`. They are prerendered and need no sign-in, so they can be used directly for Google OAuth verification once the production domain is live. The shared contact address is defined in `app/_components/legal/legal-page.tsx`. The `wa-worker/` submodule points at the pinned OpenWA fork commit; initialize it with `git submodule update --init` after cloning.

## Design system

The visual system is **Neon Tokyo** — dark-first, neon cyan/magenta on indigo-black. Tokens are defined in `app/globals.css` and documented in `DESIGN.md`. Extend those tokens rather than adding new palettes.

## Authentication status

Two real sign-in options: **Google** for everyone (Auth.js v5), and **email/password** for normal users with bcrypt hashes in Postgres. Sign-up creates a user, their shop and a trial subscription in one transaction-free create, then signs them in. The superadmin — seeded from `SUPERADMIN_EMAIL` — has no password and is rejected from the email flow; it must use Google. `/forgot-password` creates a one-hour SHA-256-hashed reset token and emails the link through Resend; `/reset-password` redeems it and signs out all old passwords by replacing the hash. Resend requires a **verified sender domain** in `EMAIL_FROM` — the default `onboarding@resend.dev` can only email the account owner. The NextAuth route is `app/api/auth/[...nextauth]/route.ts`; `/after-signin` routes superadmins to `/admin` and owners to `/dashboard`.

## Owner dashboard

`/dashboard` shows real shop data and a Neon Tokyo WhatsApp connection panel. Owners can connect, scan a QR code, watch status/restriction states, reconnect, disconnect, or forget their number. All actions are authenticated and check shop ownership before touching the gateway.

## Superadmin dashboard

Sign in with the configured Google superadmin account — `/after-signin` routes superadmins to `/admin` and normal users to `/dashboard`. Admin pages: overview with live stats and infrastructure health, shops, users, plans (create/edit limits and price), subscriptions with usage bars, platform billing (the superadmin's own AES-256-GCM encrypted PayHero or Daraja keys for receiving owner subscription payments; shop payout keys remain shop-owner scope), audit log, and settings. Every page and mutation re-checks the `SUPERADMIN` role from Postgres via `lib/auth-guards.ts`. Full scope and planned additions are in `docs/SUPERADMIN.md`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
