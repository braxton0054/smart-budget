# Superadmin — scope and plan

The superadmin is the platform operator. Identity comes from Google only (`SUPERADMIN_EMAIL` in `.env`); there is no password for this account. Shop owners and customers may use Google or email/password.

## What the superadmin owns

| Area | Responsibility | Status |
| --- | --- | --- |
| Platform overview | Shop, owner, subscription and payment totals; Postgres/Redis health | Built |
| Shops | Every tenant, its owner, plan, limits and activity | Built (read-only) |
| Users | Owners and customers, roles, account state | Built (read-only) |
| Plans | Product/message/session limits, token caps, price, grace period | Built — create and edit |
| Subscriptions | Status, usage against caps, lapsed accounts to pause the agent | Built (read-only) |
| Audit log | Who did what, including superadmin actions | Built (read-only) |
| Settings | Superadmin identity, infrastructure status, no secrets displayed | Built |
| Platform billing | Superadmin's own PayHero or Daraja (M-Pesa) keys for receiving owner subscription STK payments, encrypted with AES-256-GCM, audit trail | Built |
| Shop payout credentials | Each shop owner configures their own PayHero/Daraja keys; stored encrypted per shop, never in `.env` | Shop-owner scope — phase 5 |
| Payment reconciliation | PayHero/Daraja callbacks, polling fallback, refunds | Planned — phase 5 |
| WhatsApp sessions | One isolated OpenWA session per shop with a session-scoped key, signed per-shop webhook and encrypted auth-state mirroring | Available in the owner dashboard |
| Queue health | BullMQ inbound/broadcast depth and failures | Planned — phase 4 |
| Broadcast oversight | Daily caps, STOP compliance, throttling | Planned — phase 7 |
| Platform billing | Superadmin's own PayHero STK for owner subscriptions | Planned — phase 8 |

## Access rules

- `lib/auth-guards.ts` checks the session role on every admin page; layouts are not trusted for auth checks because they do not re-render on navigation.
- The role is set from `SUPERADMIN_EMAIL` in `auth.ts` and mirrored in the seeded `User` row.
- No payment credentials are visible in `.env` or the dashboard. Platform billing keys are encrypted in `PlatformCredential`; shop payout keys are encrypted per shop in `PaymentCredential`.

## Data model

`prisma/schema.prisma` holds all platform and tenant tables. Every tenant table carries `shopId`. See `Smart Budget Plan.md` for the product plan.
