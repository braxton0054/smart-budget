# Deploying Smart Budget (prepared, NOT deployed)

Current state (2026-11-26): prep only. The DNS record exists, the repo has
deploy-ready files locally, and the app builds. **Nothing was pushed to GitHub,
no containers were started, and no Caddy config was installed.**

## What is already done

- **DNS:** `smartbudget.mtandaolabs.com` → `185.208.207.239`, A record, TTL 1,
  grey-cloud (DNS only). Cloudflare record id
  `1f5711a1f6acaf0ebb9fe8d0d52faaed`.
  Grey-cloud is required: Caddy issues the certificate over HTTP-01.
- **Repo:** `braxton0054/smart-budget` cloned and a production build verified
  locally (`npm ci && npm run build` passed on Next.js 16.4.6).
- **Files staged locally (uncommitted):**
  | File | Role |
  |---|---|
  | `Dockerfile` | `runner` target: standalone Next.js server, healthcheck. |
  | `docker-compose.yml` | Postgres 18 + Redis 8 + app on port `127.0.0.1:3012`. |
  | `deploy.example.env` | Template for the server `.env`. |
  | `deploy/smartbudget.caddy` | Host TLS config for `smartbudget.mtandaolabs.com`. |
  | `app/api/health/route.ts` | `/api/health` liveness endpoint. |
  | `next.config.ts` | `output: "standalone"` for the small runtime image. |
  | `.github/workflows/ci.yml` | Lint, typecheck, build, Docker build. Never deploys. |
  | `.github/workflows/deploy.yml.example` | Auto-deploy workflow, **inactive** until renamed. |

Note: `smart-budget` is still the create-next-app starter plus `Smart Budget
Plan.md`. There is no Prisma schema, auth, worker or payment code yet. Postgres
and Redis are staged for phase 1/3; they are unused by the current page.

## First deploy (when you say go)

1. Push the staged files from this checkout to `main` on GitHub. (Not done yet.)
2. On the VPS, clone the repo and make the env:
   ```bash
   git clone https://github.com/braxton0054/smart-budget.git /root/smart-budget
   cd /root/smart-budget
   cp deploy.example.env .env
   # set a strong POSTGRES_PASSWORD; fill other keys when their code lands
   ```
3. Install the host-side TLS route (the VPS already runs system Caddy):
   ```bash
   sudo cp deploy/smartbudget.caddy /etc/caddy/sites/smartbudget.caddy
   sudo caddy reload --config /etc/caddy/Caddyfile
   ```
4. Start the stack:
   ```bash
   docker compose up -d --build
   curl -fsS https://smartbudget.mtandaolabs.com/api/health
   ```
   Port `3012` was chosen because `3000`, `3001`, `3030`, `3101`, `5174`,
   `8010`, `8020`, `8090`, `8092`, `8093`, `8787`, and `8888` are already in use
   on this box.

## Turning on automatic deploys (optional)

The deploy workflow is deliberately named `.example`, so CI pushes to `main`
cannot reach the server. To enable it:

1. Register a **repository-level** self-hosted runner on the VPS with labels
   `self-hosted,eavi-vps`. The current runner is bound to `eavi1-app` only.
2. Rename `.github/workflows/deploy.yml.example` → `deploy.yml` and push.
3. After that, a green CI run on `main` syncs `/root/smart-budget` to the exact
   commit CI tested, rebuilds, restarts, and gates on the public health URL.

Until step 2, deploy manually with `docker compose up -d --build` on the VPS.

## Rollback

```bash
cd /root/smart-budget
git log --oneline -5                 # pick the last good commit
git reset --hard <sha>               # .env survives (untracked)
docker compose up -d --build
curl -fsS https://smartbudget.mtandaolabs.com/api/health
```

## Before real users

- HTTPS is handled by Caddy; do not orange-cloud the DNS record or Caddy's
  HTTP-01 certificate challenge will fail.
- `APP_ENCRYPTION_KEY` must be set before any payment credentials are stored.
  Generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- The plan calls for `wa-worker` and `agent-worker` as separate containers.
  Add them to `docker-compose.yml` when their code exists — never inside the
  Next.js process.
