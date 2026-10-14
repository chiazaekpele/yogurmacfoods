# Launch checklist

One app: the shop (repo root, `shopyogurmacfoods.com`, DNS at Cloudflare), with the business owner's admin
panel at `/admin` (14 Oct 2026). The separate staff portal (`staff/`) is on hold: its
code is kept but it is not deployed. Order matters: the database must
exist before the first shop build (the sitemap reads products at build time), and
DNS must be verified before email is tested.

## 1. Database (Neon, project `quiet-king-95120590`)

Done on 7–10 Oct 2026 against endpoint `ep-billowing-thunder-b5lkvp0n` (AWS us-east-2):
both migrations applied, catalogue seeded with the four photographed products.

- [ ] Confirm which Neon branch that endpoint is; keep `production` for real customers and create a `dev` branch for testing (TRD §3)
- [ ] For any new branch: `npx prisma migrate deploy` (uses `DIRECT_URL`), then `npm run db:seed`
- [ ] Reset the database password (it was shared in a chat) and update every `.env` and Vercel project
- [ ] Locally, Node must prefer IPv4 to reach Neon (`npm run dev` already does); add `&connect_timeout=30` to both URLs on slow connections

## 2. Neon Auth (customer and admin logins)

- [ ] Neon Console → Auth: confirm email verification is **not required**
- [ ] Set `ADMIN_SIGNUP_CODE` (any hard-to-guess phrase) and give it only to the owner. They create their login at `/admin` → "Create an account"
- [ ] Once every admin has signed up, remove `ADMIN_SIGNUP_CODE` (or change it) to close admin sign-up

## 3. Services

| Service | What to do | Env vars |
|---|---|---|
| Paystack | Business account must be verified for live keys. Webhook URL: `https://<shop domain>/api/webhooks/paystack` (test and live): it confirms both orders and donations. IP list from Paystack's webhook docs. | Shop only: `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_IPS` |
| Resend | Add domain, put SPF/DKIM/DMARC records in Cloudflare DNS, wait for "verified" | `RESEND_API_KEY`, `EMAIL_FROM` |
| Upstash | One Redis database used by both apps | Both apps: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Sentry | Dropped for now | — |

## 4. Secrets to generate

`openssl rand -base64 32` for each. Set them once and do not rotate casually:
changing `ORDER_LINK_SECRET` stops addresses showing on links in emails already sent.

- [ ] Shop: `ORDER_LINK_SECRET`, `CRON_SECRET`
- [ ] Shop: `NEON_AUTH_COOKIE_SECRET`, plus `NEON_AUTH_BASE_URL=https://ep-billowing-thunder-b5lkvp0n.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth` and `ADMIN_SIGNUP_CODE`

## 5. Vercel (functions in `cle1` next to Neon)

Shop project, root directory = repo root:
- [ ] Env: everything above, plus `NEXT_PUBLIC_SITE_URL=https://<shop domain>`, `NEXT_PUBLIC_CONTACT_EMAIL`
- [ ] Preview env uses **test** Paystack keys and the Neon `dev` branch, never live ones

- [ ] `vercel.json` already disables Git auto-deploys and schedules the daily cron; deploy manually with `vercel deploy --prod`
- [ ] Domain: `shopyogurmacfoods.com` and `www.` are added in Vercel. In Cloudflare DNS: `A @ 76.76.21.21` and `CNAME www cname.vercel-dns.com`, both **DNS only** (grey cloud)

## 6. Smoke test on the live domains

Shop:
- [ ] `/api/health` returns `{"status":"ok"}` with database and redis `ok`
- [ ] Test-mode card payment: lands on the order page with the address shown; confirmation email arrives with a "View your order" link
- [ ] Same order URL without `?t=` shows the order but no address
- [ ] Bank-transfer attempt, then cancel the popup: back on checkout with details kept
- [ ] Create a customer account at checkout; it returns to checkout with details filled in. Test "forgot password" (Neon Auth sends the email)
- [ ] Test-mode order for a wellness box delivered daily for 3 days: delivery fee charged × 3, order and email show "daily for 3 days", and the "boxes sold" counter on /impact and the homepage goes up by 3
- [ ] Webhook retry: Paystack dashboard → resend event → still exactly one order

Admin (`/admin`; all of this passed locally against Neon on 14 Oct 2026):
- [ ] Owner creates their login with the sign-up code; a wrong code is refused
- [ ] Owner moves the test order through In production, Ready, Out for delivery (WhatsApp button opens with the message) and Delivered
- [ ] The test customer shows under Customers with the order in their history
- [ ] Upload a homepage image; it appears in the homepage carousel
- [ ] Change a delivery fee and an impact number; they show on the shop within seconds

Then:
- [ ] Mobile layout of the shop and admin on a real phone
- [ ] Switch to live Paystack keys, one real small order, refund it from Paystack

## 7. Still needed from the client

- Real prices for the four products, and the Cranola jar size (shown as "Jar")
- Any other products, flavours or sizes beyond the ones in the photos
- Delivery fee for each of the 20 LGAs
- Ythirst impact numbers
- More Ythirst outreach photos and a kitchen photo (the editorial strip's Ythirst and kitchen slots)
- Our Story / Ythirst copy approval
- Privacy policy: data retention period and sign-off (remove the "Draft" notice in `src/app/privacy-policy/page.tsx`)
- A real contact inbox for `NEXT_PUBLIC_CONTACT_EMAIL`
- Paystack business account status

The owner can enter prices, fees, impact numbers and homepage images in the admin once signed
in; no code change is needed. Since 13 Oct 2026: customers need an account to pay; the
₦500-per-child donations are gone; 25% of profits fund Ythirst, and the live counter on
/impact shows wellness boxes sold (each day of a daily box counts as one).

Still needed for the wellness boxes: contents of each tier and photos (owner adds them in
the admin, Products & boxes), and confirmation that the delivery fee should be charged once per
delivery day for daily boxes.
