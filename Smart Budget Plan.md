# Smart Budget: Plan

A multi-shop SaaS where shop owners connect WhatsApp and an AI sales agent sells to their customers, with payments straight to the owner's PayHero or Daraja account.

## Architecture (Docker Compose)

- **web**: Next.js app (owner dashboard, API routes, payment webhooks, super-admin)
- **wa-worker**: open-wa session manager, a separate container that holds all shop sessions. Never run it inside the Next.js process.
- **agent-worker**: consumes inbound messages from a queue and calls the LLM
- **postgres**, **redis** (BullMQ queues), **reverse proxy** (TLS)

**Message flow:** WhatsApp message → wa-worker → inbound queue → agent-worker (loads shop, customer, conversation) → LLM with tools → reply sent back through the same session.

## Agent Tools (Function Calling)

`search_products`, `get_product`, `check_service_slots`, `add_to_cart`, `create_invoice`, `request_payment`, `check_payment_status`, `set_delivery_address`, `get_order_status`, `subscribe_alerts`, `get_shop_info`, `escalate_to_owner`.

### Guardrails (payments are fully automatic)

- `shop_id` and customer are injected server-side, never taken from the LLM
- Prices and totals always come from the DB, never from the model
- Confirm the customer's phone number before every STK push
- Allow one pending STK push per customer
- Add a per-shop max order amount (default cap, owner-adjustable)
- Mark an order paid only from the PayHero/Daraja callback, never from a customer saying "I paid"

## Data Model (Postgres, `shop_id` on every tenant table)

`users`, `shops`, `plans`, `shop_subscriptions`, `wa_sessions`, `payment_credentials` (encrypted), `products`, `product_variants`, `services`, `bookings`, `customers`, `conversations`, `messages`, `orders`, `order_items`, `invoices`, `payments`, `deliveries`, `alert_subscriptions`, `broadcasts`, `audit_logs`.

## Key Decisions

- **Payments:** per-shop PayHero or Daraja credentials, encrypted with AES-GCM. Webhook at `/api/webhooks/payhero/:shopId` with secret check, plus a polling fallback to reconcile missed callbacks.
- **QR connect:** the dashboard streams the QR over SSE/WebSocket, with a session status badge and auto-reconnect.
- **Alerts:** a new product enqueues a broadcast to opted-in customers only. Throttle with random 5-15s gaps and daily caps, and honor "STOP".
- **Plans:** limits on products, messages per month, and sessions. Cap LLM tokens per plan so one shop can't burn your bill. Lapsed subscriptions get a grace period, then the agent is paused.
- **Platform billing:** your own PayHero STK for owner subscriptions.

## Build Phases

1. Foundation: auth, shops, plans, schema, dashboard shell
2. Catalog: products, variants, services, images
3. WhatsApp: QR connect, session worker, inbound/outbound
4. Agent: tools, conversation memory, guardrails
5. Payments: PayHero first, then Daraja; invoices, callbacks, receipts
6. Orders: delivery address, status tracking, bookings, owner alerts
7. New-item broadcasts
8. Subscription billing, super-admin, hardening (rate limits, logging, backups)

## Risks

- **WhatsApp bans:** open-wa is unofficial, so a customer-facing number can get banned. Tell owners up front and keep broadcasts conservative.
- **RAM:** roughly 300-500 MB per session, so size the VPS by shop count.
- **Secrets:** payment credentials need encryption at rest and an audit trail.

## Next Step

Write the full Postgres schema, or scaffold the repo and `docker-compose.yml`.
