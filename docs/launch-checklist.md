# Shop launch checklist

Order matters: the database must exist before the first Vercel build (the sitemap
reads products at build time), and DNS must be verified before email is tested.

## 1. Database (Neon, project `quiet-king-95120590`)

- [ ] `neon link --project-id quiet-king-95120590 --branch production -y` (endpoint `ep-billowing-thunder-b5lkvp0n`, AWS us-east-2)
- [ ] Create a `dev` branch for testing; keep `production` for real customers (TRD §3)
- [ ] Copy the **pooled** URL into `DATABASE_URL` and the **direct** URL into `DIRECT_URL`
- [ ] `npx prisma migrate deploy` (uses `DIRECT_URL`)
- [ ] `npm run db:seed` — placeholder catalogue until the client sends real data (section 6)
- [ ] `DB_POOL_MAX` back to `5` (the `1` in `.env.example` is only for the local Prisma dev server)

## 2. Services

| Service | What to do | Env vars |
|---|---|---|
| Paystack | Business account must be verified for live keys. Webhook URL: `https://<domain>/api/webhooks/paystack` (test and live). IP list from Paystack's webhook docs. | `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_IPS` |
| Resend | Add domain, put SPF/DKIM/DMARC records in HostAfrica DNS, wait for "verified" | `RESEND_API_KEY`, `EMAIL_FROM` |
| Upstash | One Redis database (shared later with the staff portal) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Sentry | Not wired in yet: `npm install @sentry/nextjs` timed out on 7 Oct. Add after launch. | — |
| Cloudinary | Only needed once there are product photos | — |

## 3. Secrets to generate

`openssl rand -base64 32` for each. Set them once and do not rotate casually:
changing `ORDER_LINK_SECRET` stops addresses showing on links in emails already sent.

- [ ] `ORDER_LINK_SECRET`
- [ ] `CRON_SECRET`
- [ ] `REVALIDATE_SECRET` (the staff portal will need the same value)

## 4. Vercel

- [ ] Create the project; `vercel.json` already disables Git auto-deploys, schedules the daily cleanup cron, and runs functions in Cleveland (`cle1`), next to the Neon database in AWS us-east-2
- [ ] Production env vars: everything above, plus `NEXT_PUBLIC_SITE_URL=https://<domain>` and `NEXT_PUBLIC_CONTACT_EMAIL`
- [ ] Preview env vars use **test** Paystack keys and the Neon `dev` branch, never live ones
- [ ] Deploy manually: `vercel deploy --prod`
- [ ] Domain: add it in Vercel, then set the records Vercel shows in HostAfrica DNS

## 5. Smoke test on the live domain

- [ ] `/api/health` returns `{"status":"ok"}` with database and redis `ok`
- [ ] Test-mode card payment: lands on the order page with the address shown; confirmation email arrives with a "View your order" link
- [ ] Same order URL without `?t=` shows the order but no address
- [ ] Bank-transfer attempt, then cancel the popup: back on checkout with details kept
- [ ] Partner subscription: first payment, thank-you email, cancellation from the Paystack receipt
- [ ] Webhook retry: Paystack dashboard → resend event → still exactly one order
- [ ] Mobile layout on a real phone
- [ ] Switch to live Paystack keys, one real small order, refund it from Paystack

## 6. Still needed from the client

- Product list: names, descriptions, flavours, sizes, prices
- Delivery fee for each of the 20 LGAs
- Donation tier names and monthly amounts (each becomes a Paystack plan)
- Ythirst impact numbers
- Product and page photos
- Our Story / Ythirst copy approval
- Privacy policy: data retention period and sign-off (remove the "Draft" notice in `src/app/privacy-policy/page.tsx`)
- A real contact inbox for `NEXT_PUBLIC_CONTACT_EMAIL`
- HostAfrica DNS access and Paystack business account status

Until the staff portal exists, catalogue and price changes mean editing `prisma/seed.ts`
or the database directly, followed by a call to `/api/revalidate`.
