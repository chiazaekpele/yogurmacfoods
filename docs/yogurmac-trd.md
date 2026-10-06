# Technical Requirements Document
## Yogurmac Foods Platform
### `shop.yogurmacfoods.com` and `staff.yogurmacfoods.com`

**Version:** 1.0 Draft
**Status:** For review
**Companion documents:** Shop PRD v1.0, Staff Portal PRD v1.0 (both locked)

---

## 1. Purpose and scope

The two PRDs define what the platform does. This document defines how it is built: architecture, data design, the payment and webhook mechanics, authentication, security controls, caching, testing, and deployment.

The PRDs stay the source of truth for behaviour. Where this document disagrees with a PRD, or the PRDs disagree with each other, it is called out as a **PRD gap** and collected in Section 21 with a recommended resolution. Nothing in a PRD has been silently changed.

---

## 2. Architecture overview

Two independent Next.js App Router applications deployed as two Vercel projects, sharing one Postgres schema and a small set of external services.

```
Customer browser                         Admin / Staff browser
      |                                          |
shop.yogurmacfoods.com                  staff.yogurmacfoods.com
 (Next.js, Vercel)                       (Next.js, Vercel, NextAuth)
      |        \                           /        |
      |         \                         /         |
      |          +--->  Neon Postgres  <--+         |
      |                (via Prisma)                  |
      |                                              |
      +--> Upstash Redis (shipping rate cache, rate limits)
      +--> Paystack (initialize, webhooks) ---- webhook ---> shop only
      +--> Resend (order and subscription emails)       staff: invite emails
      +--> Cloudinary (image delivery)                  staff: image upload
      +--> Sentry (errors)                              staff: Paystack plan creation
```

Key structural facts:

- The shop is public and guest-only. It has no user sessions.
- The staff portal is authenticated, role-gated, and holds all write access to catalogue, pricing, and operations.
- Orders are created in the shop's webhook handler and consumed by the staff portal's queue, so both apps read and write the same order tables.
- The Paystack webhook URL points at the shop only. The staff portal never receives Paystack webhooks.

---

## 3. Technology stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js App Router, TypeScript (strict) | Confirm the current stable Next.js and Node LTS versions at scaffold time and pin them |
| Hosting | Vercel, two projects | Automatic Git deployments disabled (Section 18) |
| Database | Neon Postgres | Pooled connection at runtime, direct connection for migrations |
| ORM | Prisma | Node runtime only, no edge runtime for routes that touch the database |
| Staff auth | NextAuth (Credentials provider) | Confirm current stable major version at scaffold time |
| Payments | Paystack | One-time via transaction initialize, recurring via Plans and Subscriptions |
| Email | Resend | Domain verified (SPF, DKIM, DMARC) before any send is tested |
| Images | Cloudinary | Browser upload from staff portal, CDN delivery on shop |
| Cache and rate limit | Upstash Redis | One instance, key prefixes per app |
| Validation | Zod | Shared schema definitions copied between repos |
| Errors | Sentry | Two projects, one per app |
| Testing | Vitest, Playwright | Plus a dedicated test database branch |
| CI | GitHub Actions | |
| Styling | Plain CSS ported from the HTML mockup | No Tailwind, per the design rule |

Password hashing uses `bcryptjs` (pure JavaScript) at 12 rounds or more. The native `bcrypt` package is the usual source of serverless build problems, and at this scale the speed difference does not matter.

---

## 4. Repositories and environments

### 4.1 Repositories

Two private GitHub repositories: `yogurmac-shop` and `yogurmac-staff`.

### 4.2 Environments

| Environment | Purpose | Database | Paystack keys | Deployed |
|---|---|---|---|---|
| Local | Day-to-day development | Neon dev branch | Test | localhost |
| Test | Automated tests, resettable | Neon test branch | Test | CI only |
| Dev | Manual review before release | Neon dev branch | Test | Vercel, manual deploy |
| Production | Real customers | Neon main branch | Live | Vercel, manual promote |

Each environment has its own Sentry environment tag, Resend configuration, and Upstash key prefix (`dev:`, `test:`, `prod:`) so test traffic never touches production data or rate limits.

### 4.3 Local webhook testing

Paystack cannot reach localhost. Use a tunnel (ngrok or cloudflared) pointed at the local shop and register that URL against the Paystack **test** mode webhook setting while developing. Paystack allows one webhook URL per mode, so remember to restore the dev deployment URL afterwards.

---

## 5. Database design

### 5.1 Topology

The PRDs require the staff portal to read shop orders and attach setback reports and claims to them. Postgres cannot enforce foreign keys across databases, so the design assumes **one logical schema per environment, used by both apps**. Each environment (dev, test, prod) is its own Neon database or branch, and both applications connect to the same one for that environment.

This is an assumption about the "two databases within one cluster" setup. If the intent was a separate database per app, the staff-only tables could live apart, but orders and products would still need to be reachable from both, and every cross-reference would lose its foreign key. Confirm before scaffolding (Section 21, item 1).

### 5.2 Schema ownership and migrations

Because the two repos each hold a copy of the Prisma schema:

- **One repo owns migrations.** Recommendation: `yogurmac-staff`, since its schema is a superset of the shop's.
- The other repo holds an identical copy of `schema.prisma` and only runs `prisma generate`. It never runs `migrate`.
- Both repos carry a `SCHEMA_VERSION` file. Any schema change updates it in both repos in the same working session, and the PR checklist includes "schema copied to the other repo".
- Migrations use `prisma migrate deploy` against dev and prod. `prisma migrate dev` runs only against local and test.
- Raw SQL migrations are used where Prisma cannot express a constraint (Section 5.5).

Connection strings: `DATABASE_URL` is the pooled Neon URL used at runtime. `DIRECT_URL` is the non-pooled URL used by Prisma for migrations (`directUrl` in the datasource block).

### 5.3 Conventions

- **Money** is stored as `Decimal(12,2)` in naira, per the PRDs. Paystack works in kobo, so conversion happens in exactly one helper (`toKobo`, `fromKobo`) and never inline. Do arithmetic on Decimal or integer kobo, never on floats.
- **Time** is stored in UTC. All business-day logic (daily logs, "orders today", analytics buckets, order ID dates, review periods) uses `Africa/Lagos` (WAT, UTC+1, no daylight saving).
- **IDs** are `cuid()` or UUID strings. The human-readable Order ID is a separate unique column.
- **Phone numbers** are normalised to E.164 (`+234XXXXXXXXXX`) at write time.

### 5.4 Additions to the PRD data models

The PRD models are the base. The following are needed to make the specified behaviour implementable (all are **PRD gaps**):

**PendingCheckout** (shop). Holds the validated cart and customer details between payment initialisation and webhook confirmation. Without it, the webhook-first rule has nothing to build the order from.

```
id              String   (primary key)
orderId         String   (unique, the YMF-YYYYMMDD-XXXXX value, also used as Paystack reference)
customerName    String
customerEmail   String
customerPhone   String
lga             String
exactAddress    String
landmark        String?
items           Json     (array of { variantId, quantity, unitPrice, productName, flavour, size })
subtotal        Decimal
shippingFee     Decimal
total           Decimal
accessCode      String   (Paystack access code)
consumedAt      DateTime?
expiresAt       DateTime
createdAt       DateTime
```

**WebhookEvent.dedupeKey** (unique string). The PRD relies on `paystackRef` for deduplication, but several subscription events carry no transaction reference. Use `dedupeKey = "{eventType}:{data.id ?? data.subscription_code ?? data.reference}"` with a unique index.

**SubscriptionPayment** (shop writes, staff reads). The staff PRD requires a "full payment history" per subscriber and donation revenue analytics, but the `Subscription` model stores no payments.

```
id                  String   (primary key)
subscriptionId      String   (foreign key → Subscription)
paystackRef         String   (unique)
amount              Decimal
status              String
paidAt              DateTime
createdAt           DateTime
```

**TaskAssignment** (staff). A task assigned to "All Staff" with one shared `status` means one person completing it completes it for everyone. Per-staff progress needs its own rows.

```
id          String  (primary key)
taskId      String  (foreign key → Task)
staffId     String  (foreign key → User)
status      Enum    (PENDING / IN_PROGRESS / COMPLETED / BLOCKED)
blockerNote String?
updatedAt   DateTime
(unique: taskId + staffId)
```

For a task assigned to one person, one row is created. For "All Staff", a row is created per active staff member at creation time and lazily for staff invited later. `Task.status` and `Task.blockerNote` are dropped in favour of this table.

**ReviewSubmission.periodStart** (Date). The PRD's `ReviewCycle` is both the question set and the cadence, but a cadence repeats. Each submission needs to say which period it answers so that "missed" can be determined. Add `periodStart` and make `(staffId, cycleId, periodStart)` unique.

**User.passwordHash** becomes nullable, so an invited user can exist before setting a password. Account state is derived: invited (no hash, `isActive` false), active, deactivated. Add `sessionVersion Int @default(0)` (Section 9.2).

**Order.amountPaid** (Decimal), recorded from the Paystack payload for reconciliation against `total`.

### 5.5 Constraints that need raw SQL

```sql
-- One in-progress order per staff member
CREATE UNIQUE INDEX one_active_claim_per_staff
  ON "OrderClaim" ("staffId") WHERE "markedReadyAt" IS NULL;
```

Prisma has no native partial unique index, so this lives in a hand-written migration file. The existing `OrderClaim.orderId` unique constraint covers the "one claim per order" rule.

Also enforce at database level: `Order.orderId` unique, `Order.paystackRef` unique, `WebhookEvent.dedupeKey` unique, `DailyLog (staffId, logDate)` unique, `LGAShippingRate.lgaName` unique, `ImpactStat.key` unique.

`AuditLog` insert-only is enforced two ways: the application exposes no update or delete path, and the production database role used by the apps has `INSERT` and `SELECT` only on that table (revoke `UPDATE` and `DELETE`).

### 5.6 Indexes

| Table | Index | Reason |
|---|---|---|
| Order | `(status, createdAt)` | Queue, dashboard status counts |
| Order | `(createdAt)` | Analytics, recent orders |
| Order | `(lga)` | LGA analytics and filter |
| Order | `(customerPhone)`, `(customerName)` | Admin search |
| OrderItem | `(orderId)`, `(variantId)` | Order detail, top-seller analytics |
| ProductVariant | `(productId)` | Product pages |
| Product | `(isActive, isFeatured)` | Catalogue, homepage |
| AuditLog | `(entityType, entityId, createdAt)` | Order status timeline |
| Subscription | `(tierId, status)` | Tier counts |
| Task / TaskAssignment | `(staffId, status)` | Staff task board |
| PendingCheckout | `(expiresAt)` | Cleanup job |

### 5.7 Seed data

A seed script creates: the 20 LGA shipping rate rows (fee 0 until the admin sets them, with checkout blocked for any LGA whose fee is unset), the three `ImpactStat` rows, the first admin user, and an inactive default `ReviewCycle`.

---

## 6. Shop: checkout and one-time payment

This is the most important flow in the platform. The PRD's webhook-first rule is kept exactly: **an order exists only after Paystack's signed webhook confirms payment.**

### 6.1 Sequence

```
1. Customer submits checkout form.
2. Client posts to POST /api/checkout  { customer, lga, items:[{variantId, quantity}] }.
3. Server: rate limit, Origin check, Zod validation.
4. Server loads each variant from the database. It rejects any that are
   unavailable or whose product is inactive. It computes subtotal from
   DATABASE prices, never from client-supplied prices.
5. Server reads the LGA shipping fee (Redis, falling back to database).
6. Server generates orderId, creates a PendingCheckout row.
7. Server calls Paystack POST /transaction/initialize:
     email, amount (kobo), reference = orderId, currency NGN,
     channels [card, bank_transfer], metadata { orderId, type: "order" }.
8. Server returns { orderId, accessCode } to the client.
9. Client opens Paystack inline using the access code (resume transaction).
10. On the popup's success callback, client navigates to /order/[orderId].
11. Paystack sends charge.success to /api/webhooks/paystack (Section 8).
12. Webhook creates the Order from PendingCheckout, sends the email.
```

Initialising the transaction on the server means the amount is fixed server-side and the customer cannot tamper with it in the browser. Confirm the exact inline method name (`resumeTransaction` with an access code) against the current Paystack inline JS docs when implementing.

### 6.2 Price drift

The cart lives in localStorage and holds only `variantId` and `quantity` plus display data. If the server's prices differ from what the cart displayed (admin changed a price), `/api/checkout` responds `409` with the fresh totals and the UI asks the customer to confirm the new amount before retrying. The server never silently charges a different amount from the one shown.

### 6.3 Order ID

Format `YMF-YYYYMMDD-XXXXX`. The date uses Lagos time. The suffix is 5 characters from an unambiguous alphabet (no `0/O`, `1/I/L`), generated with a cryptographic random source. On unique-constraint collision with an existing Order or PendingCheckout, regenerate and retry up to 5 times.

The Order ID is used directly as the Paystack `reference`. That makes the webhook lookup trivial and gives support a single identifier across the shop and the Paystack dashboard.

### 6.4 Confirmation page behaviour

The redirect can arrive before the webhook has created the order. `/order/[orderId]` therefore has three states:

1. **Order exists:** render the confirmation per the PRD.
2. **No order, but a PendingCheckout exists:** render "We're confirming your payment" and poll `GET /api/order-status/[orderId]` every 2 seconds for up to about 60 seconds, then refresh into state 1.
3. **Polling times out:** show "Your payment is being processed. You will receive an email shortly. If you do not, contact us with your Order ID." and log a Sentry warning.
4. **Neither exists:** 404.

The page never creates an order itself and never trusts the redirect as proof of payment.

### 6.5 Failure paths

| Case | Behaviour |
|---|---|
| Paystack initialize fails or times out | `/api/checkout` returns a 503 with the PRD message. The PendingCheckout row is deleted. No order. |
| Customer closes or cancels the popup | Client returns to the checkout form with state intact. PendingCheckout remains until expiry. |
| Customer pays, browser dies before redirect | Webhook still creates the order. Customer receives the email. |
| Payment succeeds but webhook finds no PendingCheckout | Treated as an incident (Section 8.3). |
| Customer retries after an abandoned attempt | A new orderId and PendingCheckout are created. Old ones expire. |

PendingCheckout rows expire after 48 hours and are removed by the cleanup job (Section 12).

---

## 7. Shop: donation subscriptions

### 7.1 Tier creation (staff portal)

Creating a tier calls Paystack `POST /plan` (name, amount in kobo, interval `monthly`), and stores the returned `plan_code` in `SubscriptionTier.paystackPlanCode`. The tier row is only written after Paystack succeeds, matching the PRD's failure rule. A tier's amount is immutable once subscribers exist.

### 7.2 Subscribing (shop)

```
1. Customer picks a tier, enters name and email.
2. POST /api/subscribe  (rate limited, Origin checked, Zod validated).
3. Server loads the active tier and calls Paystack transaction/initialize with
   email, plan = paystackPlanCode, metadata { type: "subscription", tierId, subscriberName }.
4. Client opens inline checkout with the access code and the customer pays the first instalment.
5. Paystack creates the subscription and raises subscription.create and charge.success.
6. Webhook writes Subscription and SubscriptionPayment, then sends the thank-you email.
```

When a plan code is supplied, Paystack uses the plan's amount for the charge. Do not also send an `amount` field.

### 7.3 Lifecycle events

| Paystack event | Action |
|---|---|
| `subscription.create` | Create `Subscription` (ACTIVE) with subscription code, customer code, next payment date, start date. Send thank-you email. |
| `charge.success` (with plan) | Insert `SubscriptionPayment`. Update `nextPaymentDate` if present. |
| `subscription.not_renew` | Mark as ending: status stays ACTIVE until the final paid period ends, then EXPIRED. Surface in admin list. |
| `subscription.disable` | Status CANCELLED. |
| `invoice.payment_failed` | Log and flag on the subscriber row for the admin. Status unchanged until Paystack disables it. |

`subscription.create` and `charge.success` for the first payment can arrive in either order. The handler must tolerate both: if `charge.success` arrives first, it stores the payment against a Subscription found by customer code once that exists, or parks the event as unprocessed and retries when `subscription.create` lands. Re-check the full list of event names in the current Paystack documentation when wiring this up.

---

## 8. Paystack webhook handler

Route: `POST /api/webhooks/paystack` on the shop. Node runtime, `dynamic = "force-dynamic"`.

### 8.1 Processing order

```
1. Read the RAW body with request.text(). Never parse before verifying.
2. Check the source IP against the Paystack allowlist (config value, not hard-coded).
3. Compute HMAC-SHA512 of the raw body with the secret key, hex-encoded.
   Compare with the x-paystack-signature header using timingSafeEqual.
   Any failure returns 401 and logs to Sentry. Do not reveal why.
4. Parse JSON. Build dedupeKey.
5. Insert WebhookEvent. On unique violation:
     - if the existing row is processed: return 200, do nothing.
     - if the existing row is NOT processed (earlier crash): continue and reprocess.
6. Dispatch by event type inside a database transaction.
7. Mark WebhookEvent processed with processedAt. Return 200.
```

Notes:

- The IP check reads the first address in `x-forwarded-for` as set by Vercel. The allowlist lives in an environment variable so it can change without a deploy. Paystack documents that the same IPs apply to test and live. Take the current list from Paystack's webhook documentation, not from this document. Signature verification is the primary control. The IP check is a second layer.
- Return 200 as soon as processing is done. If anything throws, return 500 so Paystack retries. Paystack retries unacknowledged deliveries, so handlers must be safe to run more than once, which the dedupe logic provides.
- Do not send email inside the database transaction. Commit first, then send.

### 8.2 `charge.success` for a one-time order

```
1. Look up PendingCheckout by data.reference. Ignore if metadata.type is "subscription".
2. Verify: data.status == "success", data.currency == "NGN",
   data.amount == toKobo(pending.total).
3. In one transaction: create Order (status CONFIRMED) and OrderItems from the
   PendingCheckout snapshot (unit prices snapshotted), set pending.consumedAt,
   write an AuditLog row (actor: system).
4. After commit: send confirmation email, set Order.emailSent on success,
   record the failure on error.
```

If the amount does not match, do not create the order. Log to Sentry at error level, mark the event processed with a note, and surface it to the admin as a payment mismatch.

### 8.3 Paid but no PendingCheckout

This should be rare (expired row, cleaned up early, or a tampered reference). The handler returns 200 so Paystack stops retrying, but raises a Sentry error and an admin dashboard alert with the reference and amount. Recovery is manual: the admin can look the payment up in the Paystack dashboard and contact the customer. The PRD does not cover this, so the 48-hour expiry and the alert are the mitigation.

---

## 9. Staff portal: authentication and authorisation

### 9.1 Login

NextAuth Credentials provider. Passwords verified with bcrypt. Login is rate limited to 5 attempts per 10 minutes per IP (Upstash sliding window). Failed and successful attempts return the same generic message so account existence is not leaked.

### 9.2 Sessions and immediate deactivation

The Credentials provider requires JWT sessions, which cannot be revoked server-side by default. The PRD requires deactivated users to lose access immediately, so:

- The JWT holds `userId`, `role`, and `sessionVersion`.
- Every protected page, server action, and route handler calls one shared function, `requireRole("ADMIN" | "STAFF")`, which loads the user from the database and rejects if the user is missing, inactive, role-mismatched, or if `sessionVersion` differs from the token.
- Deactivating a user increments their `sessionVersion`, so every existing session dies on its next request.
- Next.js middleware (edge) only does a cheap first-pass redirect for unauthenticated or obviously wrong-role requests. It is **not** the security boundary, because it does not hit the database.
- Cookies: httpOnly, secure, `SameSite=Lax`. Session `maxAge` is 8 hours, with the token refreshed on activity so that expiry behaves as 8 hours of inactivity rather than 8 hours from login.
- `lastActiveAt` is updated at most once every 10 minutes per user to avoid a write per request.

At 30 staff, one indexed primary-key lookup per request is negligible.

### 9.3 Invites

1. Admin enters name and email. A `User` row is created with `isActive=false`, no password hash.
2. A 32-byte random token is generated. Only its SHA-256 hash and a 24-hour expiry are stored. The raw token appears only in the emailed link.
3. The setup page validates the token, sets the password hash (bcrypt), clears the token fields, and sets `isActive=true`.
4. Resend invite is rate limited (3 per hour per admin) and issues a fresh token.
5. If the email fails to send, the admin sees the error and can retry. The row stays in the invited state.
6. Re-inviting a deactivated staff member (the PRD's password reset path) reuses the existing row: new token, password hash cleared, `sessionVersion` incremented. A new row would collide on the unique email.

### 9.4 Authorisation rules

- Every admin handler calls `requireRole("ADMIN")`. Every staff handler calls `requireRole("STAFF")`.
- Staff queries go through dedicated data functions that use explicit Prisma `select` clauses. Customer name, phone, email, address, and landmark are never selected on any staff path. A test asserts that staff API responses contain none of those keys.
- `/staff/queue/[orderId]` returns 404 unless the order is CONFIRMED or claimed by the requesting staff member.
- Staff can only read and write their own logs, review submissions, task assignments, announcement reads, and setback reports. Every query is scoped by `staffId` from the session, never from request input.
- Admin mutations write to `AuditLog` inside the same transaction as the change.

### 9.5 Order status transitions

One transition table, enforced server-side in a single function:

| From | To | Who |
|---|---|---|
| CONFIRMED | IN_PRODUCTION | Staff (via claim only) |
| IN_PRODUCTION | READY | Staff who holds the claim |
| READY | OUT_FOR_DELIVERY | Admin |
| OUT_FOR_DELIVERY | DELIVERED | Admin |

Anything else is rejected. Every transition writes an `AuditLog` row, which is the source for the order status timeline on the admin order page. Whether the admin can move an order backwards is an open decision (Section 21, item 8).

### 9.6 Claiming an order

```ts
await prisma.$transaction(async (tx) => {
  const moved = await tx.order.updateMany({
    where: { id: orderId, status: "CONFIRMED" },
    data:  { status: "IN_PRODUCTION" },
  });
  if (moved.count !== 1) throw new AlreadyClaimedError();
  await tx.orderClaim.create({ data: { orderId, staffId } });
  await tx.auditLog.create({ /* ORDER_STATUS_CHANGED */ });
});
```

The conditional `updateMany` is the race guard: only one of two simultaneous requests sees `count === 1`. The partial unique index from Section 5.5 enforces the one-active-order-per-staff rule even if application code is wrong. A unique-violation error (Prisma `P2002`) maps to the PRD's friendly messages: "Mark your current order as Ready before claiming another." or "That order was just claimed by someone else."

### 9.7 Rate limiting and CSRF

Server Actions in the App Router check the `Origin` header against the host by default. Route Handlers do not get that protection, so every mutating Route Handler on both apps must run the shared `assertSameOrigin()` helper. SameSite cookies and the role checks add further protection but do not replace it.

---

## 10. Cross-application caching

The two apps are separate deployments, so a change made in the staff portal cannot invalidate the shop's cache by itself.

### 10.1 ISR pages (products, prices, impact stats, tiers)

- The shop fetches with cache tags (`products`, `impact`, `tiers`) and a time-based `revalidate` as a safety net (60 seconds for products and prices, 300 seconds for impact stats, per the PRD).
- The shop exposes `POST /api/revalidate`, protected by a shared secret header (`REVALIDATE_SECRET`) and not by Origin. It calls `revalidateTag` for the tags in the body.
- After any admin write that affects the shop (product, variant, featured or active toggle, tier, impact stat), the staff portal calls that endpoint. A failure is logged but does not fail the admin's save, since the time-based revalidate still catches up.

This meets the staff PRD's "immediately reflects on the shop" without giving up the shop PRD's caching. Without on-demand revalidation, changes would take up to 60 seconds to appear (5 minutes for impact stats).

### 10.2 LGA shipping rates (Redis)

Key `shipping:rates:v1` holds all 20 rates as one JSON value. The shop reads Redis and falls back to the database on a miss, then repopulates. The staff portal deletes the key on every save. Both apps use the same Upstash instance, so the staff portal needs the Upstash credentials too. The checkout API always reads shipping from this source on the server. It never trusts a fee sent by the client.

### 10.3 Never cached

Orders, order status, webhook handling, `/api/order-status`, and anything in the staff portal.

---

## 11. Security

### 11.1 Shop

- **Input:** Zod on every Route Handler. Reject unknown keys. Never pass raw request bodies to Prisma.
- **Origin check:** `/api/checkout` and `/api/subscribe` reject requests whose `Origin` is not `https://shop.yogurmacfoods.com` (plus the dev and localhost origins in non-production). **Exempt** `/api/webhooks/paystack` (server-to-server, no browser Origin, protected by signature and IP) and `/api/revalidate` (protected by shared secret). Applying the PRD's origin rule to the webhook would reject every payment.
- **Rate limiting:** Upstash sliding window, 10 requests per IP per minute on `/api/checkout` and `/api/subscribe`. Apply a lighter limit to `/api/order-status`.
- **Secrets:** Paystack secret key and webhook handling exist only in server code. Only the public key reaches the client.
- **Public order page:** `/order/[orderId]` is world-readable by design and shows a name and delivery address. The 5-character suffix gives roughly 33 million combinations per day, which is not a strong secret. See Section 21, item 2.
- **CSP:** see 11.3.
- **Cookie notice:** shown on first visit, preference stored in a first-party cookie. The shop sets no tracking cookies in v1.

### 11.2 Staff portal

- bcrypt at 12 rounds or more. No password hash ever leaves the server.
- Invite tokens: 32 random bytes, stored hashed, single use, 24-hour expiry.
- Descriptions and announcement bodies are stored as plain text with tags stripped on write, and rendered as text (React escaping). `dangerouslySetInnerHTML` is not used anywhere. If rich text is later required, sanitise with a maintained HTML sanitiser at write time and render time.
- `AuditLog` is insert-only (Section 5.5). There is no UI or API to alter it.
- Admin routes return 403 to staff users and redirect unauthenticated users to login.

### 11.3 Content Security Policy

Both apps set CSP in `next.config.js` or middleware. The policy must allow, at minimum: Paystack's inline script host (`js.paystack.co`), Paystack checkout frames (`checkout.paystack.com`), the Paystack API for connect, `res.cloudinary.com` for images (and Cloudinary's upload endpoint on the staff portal), and Sentry's ingest host.

There is a real tension to decide up front. Nonce-based CSP in Next.js requires dynamic rendering for every page that uses the nonce, which defeats the static and ISR caching the shop PRD relies on. Recommended: use nonces on the **staff portal** (everything there is dynamic anyway), and on the **shop** use a static-compatible policy (`script-src 'self'` plus the Paystack host and the minimum inline allowance Next.js needs) rather than forcing the whole shop dynamic. Revisit if Next.js hash-based CSP support matures. See Section 21, item 4.

Also set: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options` or `frame-ancestors 'none'`, and a restrictive `Permissions-Policy`.

### 11.4 NDPR

- Privacy policy at `/privacy-policy` covering collection, purpose, retention, deletion requests, cookies, and contact.
- Cookie notice on the shop.
- Deletion requests: the staff PRD has no deletion function. Recommended v1 approach is to **anonymise** rather than delete: a documented script replaces name, email, phone, address, and landmark on the customer's orders with placeholders, preserving totals and items for sales analytics. Run by the developer on request, logged to `AuditLog`. See Section 21, item 9.
- Customer data is used for order fulfilment only, and is never exposed to staff beyond order items.

---

## 12. Scheduled jobs

Use Vercel Cron on the staff portal, each endpoint protected by `Authorization: Bearer CRON_SECRET`. Check the cron limits of the Vercel plan in use before relying on schedule frequency.

| Job | Schedule | Action |
|---|---|---|
| Mark missed reviews | Daily, shortly after midnight Lagos | For each active staff member and each elapsed review period with no submission, create a `ReviewSubmission` with `isMissed = true` |
| Clean pending checkouts | Daily | Delete `PendingCheckout` rows past `expiresAt` |
| Clean old webhook payloads | Optional, monthly | Null out payload JSON on processed events older than a retention period, keeping the dedupe key |

**Scheduled announcements need no cron.** An announcement is visible to staff when `scheduledFor <= now`. Set `publishedAt` lazily on first read, or treat `scheduledFor` as the publish time. This avoids a job that can silently fail.

---

## 13. Email and WhatsApp

### 13.1 Resend

| Email | App | Trigger |
|---|---|---|
| Order confirmation | Shop | After order commit in webhook |
| Subscription thank-you | Shop | After subscription commit in webhook |
| Staff invite | Staff | Admin invites or resends |

- Templates built with React Email, rendered server-side, plain and mobile-friendly.
- Sender is a verified address on `yogurmacfoods.com`.
- Sends happen after the database commit. On failure, retry once inline, then record the failure and leave `emailSent = false`.
- The admin dashboard lists orders with `emailSent = false` with a resend button. The webhook retry path and the resend button both check `emailSent` first so a customer is not emailed twice. Use Resend's idempotency key support if the SDK version offers it (key: `order-confirmation-{orderId}`).
- Non-production environments send only to allowlisted addresses.

### 13.2 WhatsApp click-to-chat

Built from stored data, no API calls:

```
https://wa.me/{E164 digits, no plus}?text={encodeURIComponent(message)}
```

The number is the normalised phone (`2348012345678`, no `+`, no leading `0`). The message follows the PRD template exactly. The button appears only when the status moves to OUT_FOR_DELIVERY and remains available on the order detail page afterwards, in case the admin closes the tab.

---

## 14. Images (Cloudinary)

- Staff portal uploads directly from the browser, so image bytes never reach the Next.js server.
- Client-side checks: JPG, PNG, WEBP only, 5 MB maximum. These are convenience only. The real limits must be enforced by Cloudinary.
- The PRD and setup use an **unsigned** upload preset (`yogurmac_products`). An unsigned preset can be used by anyone who learns the cloud name and preset name, so it must be locked down in Cloudinary: allowed formats set to jpg, png, webp, a fixed folder, a maximum file size, and overwrite disabled. Preferred alternative: a **signed** upload, where an admin-only endpoint signs the upload parameters. The file still goes straight to Cloudinary. See Section 21, item 5.
- On product save, the server validates with Zod that every image URL starts with the expected `https://res.cloudinary.com/{cloud_name}/` prefix. Arbitrary URLs are rejected.
- Shop: `next/image` with `remotePatterns` restricted to the Cloudinary host, requesting auto format and quality. An `onError` fallback swaps in a branded placeholder, so a Cloudinary outage does not break layout.

---

## 15. Validation reference

| Field | Rule |
|---|---|
| Full name | Trimmed, 2 to 100 characters |
| Email | Valid email, lowercased, max 254 |
| Phone | Nigerian mobile. Accept `0[789][01]\d{8}`, `234[789][01]\d{8}`, `+234[789][01]\d{8}`. Normalise to `+234XXXXXXXXXX`. |
| LGA | One of the 20 known values (enum from a shared constant) |
| Exact address | Trimmed, 5 to 300 characters |
| Landmark | Optional, max 150 |
| Cart items | 1 to 50 lines, quantity integer 1 to 99, `variantId` must exist and be available |
| Price, fee | Positive decimal, 2 decimal places, sane upper bound |
| Slug | Lowercase letters, numbers, hyphens, unique |
| Product images | 1 to 5 URLs, Cloudinary prefix only |

The phone pattern targets mobile numbers because the number drives WhatsApp and rider contact. Landlines are intentionally rejected. Validate on the client for UX and again on the server, which is the only validation that counts.

---

## 16. Error handling and observability

- Sentry in both apps, with the release set from the commit hash and the environment tag set per environment. Scrub customer PII (name, phone, email, address) from events before send.
- Maintenance page: if the database is unreachable, a root error boundary and a health check render a branded maintenance page with no stack trace. `/api/health` checks database and Redis connectivity and is used by deploy smoke tests.
- Every webhook failure, payment mismatch, orphan payment, and email failure is a Sentry event. The first three also surface in the admin dashboard.
- Structured logs include `orderId`, `paystackRef`, and `webhookEventId` so one payment can be traced end to end.
- Uptime monitoring on `/api/health` for both domains, with alerts to the owner.

---

## 17. Testing

### 17.1 Unit (Vitest)

Order ID generator (format, charset, Lagos date), kobo conversion, phone validation and normalisation, shipping and total calculation, order status transition table, WhatsApp link builder, webhook signature verification (valid, tampered, wrong key), dedupe key builder, review period calculation, Zod schemas.

### 17.2 Integration (Vitest with the Neon test branch)

- Webhook end to end: valid event creates one order and items with snapshotted prices. Same event twice creates one order. Wrong signature creates nothing. Amount mismatch creates nothing. Out-of-order subscription events reconcile.
- `/api/checkout`: rejects unavailable variants, rejects an inactive product, ignores client-supplied prices, returns 409 on drift.
- Claim race: fire two simultaneous claims, exactly one succeeds. A second claim by the same staff member fails on the partial index.
- Authorisation: staff request to an admin route returns 403. A deactivated user's next request fails. Staff payloads contain no customer fields.
- Invite token: expired, reused, and tampered tokens are rejected.
- Daily log: edit allowed within one hour, rejected after.
- Reset the test database before each suite (branch reset or truncate).

### 17.3 End to end (Playwright)

- Browse, choose a variant, confirm dynamic price, add to cart, checkout, reach the confirmation page.
- Paystack's popup is hard to automate reliably. For the pipeline, simulate payment by posting a **correctly signed** `charge.success` payload to the webhook route, then assert the confirmation page and the order in the staff queue. Do a real Paystack test-card run manually before each production release.
- Staff flow: invite, set password, claim, mark ready, admin moves to out for delivery, WhatsApp link appears.
- Admin flow: edit a product price, confirm the shop reflects it after revalidation.

### 17.4 Pre-release manual checklist

Real Paystack test-mode card payment and bank-transfer attempt, subscription first payment and cancellation, email rendering in a real inbox, mobile layout on a real phone for both apps (the staff portal must be mobile responsive), and a webhook retry (return 500 once, confirm one order results).

---

## 18. CI/CD and deployment

### 18.1 No automatic deployments

The rule is that nothing reaches Vercel automatically. For each Vercel project, disable Git-triggered deployments (the project's Git settings, or `"git": { "deploymentEnabled": false }` in `vercel.json`; confirm against current Vercel docs). Deployments are then manual, via the Vercel CLI or dashboard.

### 18.2 GitHub Actions (CI only, never deploys)

On every pull request and push to the main branch:

1. Install with a lockfile, cached.
2. `prisma validate` and `prisma generate`.
3. Lint and type check.
4. Vitest unit and integration, against the Neon test branch.
5. Production build (`next build`) to catch build failures.
6. Playwright e2e on main branch pushes and before release, not on every push.

### 18.3 Promotion path

`localhost` → **dev** (manual deploy, dev database, Paystack test keys) → **production** (manual promote, live keys).

Release steps for a change that includes a migration:

1. Merge after CI is green.
2. Take a Neon restore point or branch before touching production.
3. Run `prisma migrate deploy` against dev, deploy the app to dev, run the manual checklist.
4. Run `prisma migrate deploy` against production **before** deploying code that needs it. Write migrations to be backwards compatible with the previous release (add before remove) so the window between migration and deploy is safe.
5. Deploy the owner app and the other app, then run the smoke test (`/api/health`, one test order if safe).

### 18.4 Domains and DNS

Domain registered at HostAfrica. The shop is on the apex or `shop.` per the current setup, and `staff.` is a CNAME to Vercel. Resend verification records (SPF, DKIM, DMARC) are added in the same DNS panel and must propagate before email testing.

---

## 19. Environment variables

**Shop**

| Variable | Notes |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Neon pooled and direct |
| `PAYSTACK_SECRET_KEY` | Server only |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Client |
| `PAYSTACK_WEBHOOK_IPS` | Allowlist, comma separated |
| `RESEND_API_KEY`, `EMAIL_FROM` | |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Delivery |
| `REVALIDATE_SECRET` | Shared with the staff portal |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | |
| `NEXT_PUBLIC_SITE_URL`, `ALLOWED_ORIGINS` | |

**Staff portal**

| Variable | Notes |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Same database as the shop for the environment |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Secret from `openssl rand -base64 32` |
| `PAYSTACK_SECRET_KEY` | Plan creation only |
| `RESEND_API_KEY`, `EMAIL_FROM` | Invites |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Same instance as the shop |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Unsigned flow |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Only if signed uploads are adopted |
| `SHOP_URL`, `REVALIDATE_SECRET` | Cross-app revalidation |
| `CRON_SECRET` | |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | |

`.env` files are never committed. A committed `.env.example` lists names only. Vercel environment variables are scoped per environment, so a preview deployment can never hold live keys.

---

## 20. Performance, SEO, accessibility

- Server Components by default. Client components only for the variant picker, cart, checkout form, and interactive staff widgets.
- Targets from the shop PRD: LCP under 2.5s, CLS under 0.1, INP under 200ms. Fixed image dimensions, `next/font` for Barlow Condensed with `display: swap`, and priority loading only for the hero image.
- Shop SEO: per-page metadata, Open Graph tags, `sitemap.xml` and `robots.txt` (products and static pages only, never `/cart`, `/checkout`, `/order/*`), `Product` structured data on product pages.
- Staff portal is `noindex` and excluded in robots.
- Accessibility: semantic HTML, labelled form controls, visible focus states, error messages tied to fields, sufficient contrast against the cream background (check the gold on cream pairing specifically), and keyboard-operable variant selectors.
- Staff portal tables must work at phone widths (card layout or horizontal scroll), since the portal is web-only and must be mobile responsive.

---

## 21. Open decisions and PRD gaps

Each item needs a decision before or during scaffolding. A recommendation is given.

1. **Database topology.** Confirm that both apps share one logical database per environment. Recommended, because the staff PRD needs foreign keys from claims, setbacks, and tasks to orders. This document assumes it.
2. **Public order page exposure.** `/order/[orderId]` shows an address to anyone with the ID. Recommended: rate limit the route and mask the phone and email, or append an unguessable token to the confirmation URL (`/order/[orderId]?t=...`) and require it. Changing the Order ID format is not necessary.
3. **"Immediately" versus 60-second cache.** The two PRDs disagree. Recommended: on-demand revalidation (Section 10), keeping the time-based refresh as a fallback.
4. **CSP versus static rendering.** Recommended: nonces on the staff portal, a static-compatible policy on the shop (Section 11.3).
5. **Cloudinary signed versus unsigned.** Recommended: signed uploads. If unsigned is kept for v1, lock the preset down as described in Section 14.
6. **"All Staff" task progress.** Recommended: `TaskAssignment` table (Section 5.4) so each person has their own status.
7. **Review model.** Add `periodStart` to submissions. Also, the staff PRD says questions can show "one at a time or all on one page (configured by admin)" but gives the admin no such setting. Recommended: drop the setting and show all questions on one page in v1, or add a single boolean on `ReviewCycle`.
8. **Backward status moves.** The PRD says only "move to the next status". Recommended: forward only for staff paths, and allow the admin to step back one status with a required reason, logged in `AuditLog`, to correct mistakes.
9. **NDPR deletion.** No function exists in the staff PRD. Recommended: anonymisation script run on request in v1, an admin function later.
10. **Revenue definition.** Analytics should state whether revenue includes shipping. Recommended: show product revenue (subtotal) and total collected (including shipping) separately.
11. **Subscription payment failures.** The PRD does not say what the admin sees when a renewal fails. Recommended: a flag on the subscriber row, driven by `invoice.payment_failed`.
12. **Paystack live account.** A registered business account is required for live keys and a live webhook URL. Confirm the status of that account, since production payments cannot be tested without it.

---

*End of Document: Technical Requirements Document v1.0 Draft*
