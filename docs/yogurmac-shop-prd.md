# Product Requirements Document
## Yogurmac Foods — Customer Store
### `shop.yogurmacfoods.com`

**Version:** 1.0  
**Status:** Locked  
**Prepared for:** Yogurmac Foods Limited  

---

## 1. Overview

This document specifies the complete requirements for the customer-facing ecommerce store for Yogurmac Foods Limited. It is the source of truth for design, engineering, and testing of `shop.yogurmacfoods.com`.

The store is a guest-first, make-to-order platform where customers browse and purchase premium Greek yogurt, granola, and energy bars, and optionally sign up as donation partners funding the Ythirst Community Project.

---

## 2. Objectives

- Give customers a seamless, trustworthy way to place orders without requiring an account
- Showcase the Yogurmac brand — its faith-driven identity, premium quality, and social mission
- Support product variants (size and flavour) with dynamic, admin-controlled pricing
- Handle delivery across all 20 Lagos LGAs with admin-configurable shipping rates
- Process one-time product orders and recurring donation subscriptions via Paystack
- Surface Ythirst impact numbers updated manually by the admin
- Notify customers at key moments via email (automated) and WhatsApp (manual, click-to-chat)

---

## 3. User Personas

### 3.1 The Customer
A Lagos-based individual purchasing Greek yogurt, granola, or energy bars for personal or household consumption. They may be a first-time or returning buyer. They do not need an account — they checkout as a guest every time. They receive an Order ID and a confirmation email as their record of purchase.

### 3.2 The Donation Partner
An individual or organisation who believes in Yogurmac's mission and wants to financially support the Ythirst Community Project. They subscribe to a donation tier configured by the admin. They make no product purchase — their contribution goes directly to outreach funding. They receive a confirmation email on subscription.

---

## 4. Site Architecture

| Route | Page | Access |
|---|---|---|
| `/` | Homepage | Public |
| `/products` | Full product catalog | Public |
| `/products/[slug]` | Product detail page | Public |
| `/our-story` | Brand story and mission | Public |
| `/ythirst` | Ythirst Community Project | Public |
| `/partner` | Donation subscription tiers | Public |
| `/cart` | Cart | Public |
| `/checkout` | Checkout form and payment | Public |
| `/order/[orderId]` | Order confirmation | Public |
| `/privacy-policy` | NDPR privacy policy | Public |

---

## 5. Feature Specifications

### 5.1 Homepage `/`

**Purpose:** First impression. Communicates brand identity, drives product discovery, and surfaces the Ythirst mission.

**Sections:**

**Hero**
- Full-width banner with brand tagline and a primary CTA button — "Shop Now" linking to `/products`
- Secondary CTA — "Partner With Us" linking to `/partner`

**Featured Products**
- A curated selection of up to 6 products pulled from the database, marked as featured by the admin
- Each product card shows: product image, name, starting price ("From ₦X,XXX"), and an "Order Now" button linking to the product detail page
- No stock indicators — products are always available (make-to-order)

**Ythirst Impact Strip**
- Three headline numbers displayed prominently:
  - Total children reached
  - Outreach campaigns completed
  - Schools visited
- These numbers are stored in the database and updated manually by the admin from the staff portal
- Below the numbers: a short description of the project and a CTA linking to `/ythirst`

**Partnership CTA**
- A section surfacing the donation subscription offer
- Headline, short description, and a "Become a Partner" button linking to `/partner`

**Brand Values Strip**
- Three or four short brand pillars (faith-driven, indigenous quality, community impact, wholesome nutrition) displayed as icon + label cards

---

### 5.2 Products Page `/products`

**Purpose:** Full product catalog for browsing.

**Behaviour:**
- Displays all active products in a grid layout
- Each product card shows: product image, product name, category (yogurt / granola / energy bar), starting price ("From ₦X,XXX" — the lowest variant price), and an "Order Now" button
- Products are filterable by category
- Inactive products (toggled off by admin) do not appear

---

### 5.3 Product Detail Page `/products/[slug]`

**Purpose:** Where the customer selects their variant and adds to cart.

**Behaviour:**
- Product name, description, and images (gallery if multiple)
- Two dropdowns or button selectors: **Flavour** and **Size**
- Price updates dynamically as the customer changes their selection — every size/flavour combination has its own price set by the admin
- If a combination is unavailable, it is greyed out and cannot be selected
- Quantity selector (minimum 1)
- "Add to Cart" button — adds selected variant and quantity to the cart
- Estimated fulfilment note: "Made fresh to order — ready in 2–3 business days"
- Below the product: a short brand story snippet and a link to `/our-story`

---

### 5.4 Our Story Page `/our-story`

**Purpose:** Brand narrative page.

**Content:**
- Full brand identity statement
- Faith-driven mission copy
- Section on the Ythirst Community Project with a CTA to `/ythirst`
- Images of products and outreach activities

---

### 5.5 Ythirst Page `/ythirst`

**Purpose:** Dedicated impact page for the community project.

**Content:**
- Full Ythirst mission narrative
- Impact numbers (same three headline stats from homepage, pulled from the same database values)
- Description of what the outreach visits look like
- CTA to `/partner` — "Join the mission, become a partner"

---

### 5.6 Partner Page `/partner`

**Purpose:** Donation subscription sign-up.

**Behaviour:**
- Displays all active donation tiers created by the admin
- Each tier card shows: tier name, description, monthly amount, and a "Subscribe" button
- On clicking Subscribe, the customer is taken to a simple form:
  - Full name
  - Email address
- Payment is processed via Paystack recurring billing (monthly)
- On successful subscription:
  - Customer is shown a thank-you confirmation screen
  - Confirmation email is sent via Resend with tier name, amount, and a short message of gratitude
- No product is delivered — this is a pure donation

---

### 5.7 Cart `/cart`

**Purpose:** Review items before checkout.

**Behaviour:**
- Lists all items in the cart: product image, name, flavour, size, unit price, quantity selector, line total, remove button
- Order subtotal displayed (excluding shipping — shipping is calculated at checkout based on LGA)
- "Proceed to Checkout" CTA
- "Continue Shopping" link back to `/products`
- Cart state is stored in browser local storage — no account required, persists across page refreshes

---

### 5.8 Checkout `/checkout`

**Purpose:** Capture delivery details and process payment.

**Form Fields (in order):**

**Customer Details**
- Full name (required)
- Phone number (required) — this is what the rider calls and what the WhatsApp click-to-chat uses
- Email address (required) — for order confirmation email

**Delivery Details**
- LGA dropdown — all 20 Lagos LGAs listed
  - On LGA selection, shipping fee auto-populates from admin-configured rates
- Exact address (required)
- Nearby landmark (optional)

**Order Summary**
- Itemised list of cart contents with quantities and prices
- Subtotal
- Shipping fee (auto-filled on LGA selection)
- Order total

**Payment**
- "Place Order & Pay" button initiates Paystack inline checkout
- Customer pays via card or bank transfer

**Behaviour on Payment:**
- Paystack payment window opens inline
- On payment success from Paystack's side, customer is redirected to `/order/[orderId]`
- The order is only written to the database when Paystack's webhook confirms the payment — not on redirect (webhook-first pattern)
- If a customer pays and their browser closes before the redirect, the webhook still fires and the order is created correctly

**Validation:**
- All required fields validated with Zod before payment is initiated
- Phone number validated as a valid Nigerian number
- If any required field is missing, the relevant field is highlighted with an error message

---

### 5.9 Order Confirmation `/order/[orderId]`

**Purpose:** Confirm the order to the customer after successful payment.

**Content:**
- "Your order has been received" message
- Order ID displayed prominently (e.g. `YMF-20240622-X7K2P`)
- Summary: items ordered, delivery address, LGA, total paid
- Message: "You will receive a confirmation email shortly. We will notify you when your order is on its way."
- Estimated fulfilment: "Your order will be ready in 2–3 business days"
- Link back to `/products`

**Automated trigger:**
- Confirmation email is sent to the customer via Resend immediately on order creation

---

### 5.10 Privacy Policy `/privacy-policy`

**Purpose:** NDPR compliance.

**Content:**
- What personal data is collected (name, phone, email, address)
- Why it is collected (order fulfilment, delivery, notifications)
- How long it is retained
- How a customer can request deletion of their data (contact email provided)
- Cookie usage statement
- Contact information for data-related enquiries

---

## 6. Data Models

### Product
```
id              String  (primary key)
name            String
slug            String  (unique — used in URL)
description     String
category        Enum    (YOGURT / GRANOLA / ENERGY_BAR)
images          String[] (Cloudinary URLs)
isFeatured      Boolean (appears on homepage)
isActive        Boolean (visible on store)
createdAt       DateTime
updatedAt       DateTime
```

### ProductVariant
```
id              String  (primary key)
productId       String  (foreign key → Product)
flavour         String
size            String
price           Decimal
isAvailable     Boolean
createdAt       DateTime
updatedAt       DateTime
```

Each product can have many variants. Every flavour/size combination is a separate variant record with its own price.

### LGAShippingRate
```
id              String  (primary key)
lgaName         String  (one of the 20 Lagos LGAs)
shippingFee     Decimal
updatedAt       DateTime
```

Admin sets one fee per LGA. The checkout reads this table when the customer selects their LGA.

### Order
```
id              String  (primary key, internal UUID)
orderId         String  (unique, human-readable: YMF-YYYYMMDD-XXXXX)
customerName    String
customerEmail   String
customerPhone   String
lga             String
exactAddress    String
landmark        String? (optional)
subtotal        Decimal
shippingFee     Decimal
total           Decimal
status          Enum    (CONFIRMED / IN_PRODUCTION / READY / OUT_FOR_DELIVERY / DELIVERED)
paystackRef     String  (Paystack payment reference)
emailSent       Boolean (confirmation email sent)
createdAt       DateTime
updatedAt       DateTime
```

### OrderItem
```
id              String  (primary key)
orderId         String  (foreign key → Order)
variantId       String  (foreign key → ProductVariant)
quantity        Int
unitPrice       Decimal (price at time of order — snapshot, not a live reference)
```

Unit price is stored as a snapshot at the time of order. If the admin later changes a variant's price, existing orders are unaffected.

### SubscriptionTier
```
id                  String  (primary key)
name                String
description         String
monthlyAmount       Decimal
paystackPlanCode    String  (Paystack plan reference)
isActive            Boolean
createdAt           DateTime
updatedAt           DateTime
```

### Subscription
```
id                          String  (primary key)
tierId                      String  (foreign key → SubscriptionTier)
subscriberName              String
subscriberEmail             String
paystackSubscriptionCode    String
paystackCustomerCode        String
status                      Enum    (ACTIVE / CANCELLED / EXPIRED)
startDate                   DateTime
nextPaymentDate             DateTime
createdAt                   DateTime
updatedAt                   DateTime
```

### ImpactStat
```
id          String  (primary key)
key         String  (unique identifier e.g. "children_reached", "campaigns_run", "schools_visited")
label       String  (display label e.g. "Children Reached")
value       Int
updatedAt   DateTime
```

Three records exist in this table, one per stat. The admin updates the value from the staff portal and the shop reads the latest value.

### WebhookEvent
```
id              String  (primary key)
provider        String  (PAYSTACK)
eventType       String  (e.g. charge.success, subscription.create)
paystackRef     String
payload         Json
processed       Boolean
processedAt     DateTime?
createdAt       DateTime
```

Every Paystack webhook is logged here before processing. Prevents duplicate order creation if the same event is delivered twice.

---

## 7. Order Flow

```
Customer fills checkout form
        ↓
Zod validates all fields — errors surfaced inline if invalid
        ↓
Customer clicks "Place Order & Pay"
        ↓
Paystack inline payment window opens
        ↓
Customer pays (card or bank transfer)
        ↓
Paystack redirects browser to /order/[orderId] (display only)
        ↓
Paystack sends webhook to server (background, guaranteed delivery)
        ↓
Server verifies webhook signature + IP origin
        ↓
Server checks WebhookEvent table — duplicate? Stop. New? Continue.
        ↓
Order written to database with status: CONFIRMED
        ↓
Confirmation email sent to customer via Resend
        ↓
Order appears in staff portal production queue
```

---

## 8. Order Status Flow

| Status | Meaning | Customer Notification |
|---|---|---|
| CONFIRMED | Payment verified, order received | Confirmation email via Resend |
| IN_PRODUCTION | Staff have claimed and started the order | None |
| READY | Order is made and packaged | None |
| OUT_FOR_DELIVERY | Rider has picked up the order | Admin sends WhatsApp message manually via click-to-chat |
| DELIVERED | Order has been delivered | None |

Status changes are triggered from the staff portal. Moving an order to OUT_FOR_DELIVERY surfaces a pre-filled WhatsApp click-to-chat link for the admin to send to the customer's phone number in one click.

---

## 9. Payment Flow — Subscriptions

```
Customer selects a donation tier on /partner
        ↓
Fills in name and email
        ↓
Paystack initialises a recurring plan payment
        ↓
Customer pays first instalment
        ↓
Paystack webhook confirms subscription creation
        ↓
Subscription record written to database
        ↓
Confirmation email sent to subscriber via Resend
        ↓
Paystack handles all subsequent monthly charges automatically
        ↓
Webhook events for renewals and cancellations update the subscription status
```

---

## 10. Notifications

### Email (Resend)

| Trigger | Recipient | Content |
|---|---|---|
| Order confirmed | Customer | Order ID, items, delivery address, total paid, estimated fulfilment |
| Subscription created | Donor | Tier name, monthly amount, thank-you message |

### WhatsApp (Click-to-Chat — Manual)

| Trigger | Action |
|---|---|
| Admin moves order to OUT_FOR_DELIVERY | Staff portal displays a click-to-chat button pre-filled with customer name, Order ID, address, and a delivery message. Admin clicks it, WhatsApp opens, admin hits send. |

Pre-filled message template:
> "Hi [Customer Name], your Yogurmac order [Order ID] is on its way! Our rider will reach you at [Address], [LGA]. Please keep your phone nearby."

---

## 11. Security Requirements

### API & Input
- All checkout and subscription API routes are server-side only (Next.js Route Handlers)
- Zod validation on every API route — no unvalidated data reaches the database
- Rate limiting via Upstash Redis on `/api/checkout` and `/api/subscribe` — maximum 10 requests per IP per minute
- CSRF protection configured in Next.js App Router

### Payments
- Paystack secret key never exposed to the client
- Every Paystack webhook verified against: (a) Paystack's published IP addresses, (b) HMAC signature using secret key
- Idempotency enforced via WebhookEvent table — duplicate events produce no action

### File Uploads
- Not applicable on the shop — only the staff portal handles admin uploads

### Headers
- Strict Content Security Policy headers set in `next.config.js`
- Shop API routes reject requests not originating from `shop.yogurmacfoods.com`

### NDPR
- Privacy policy accessible at `/privacy-policy`
- Cookie consent notice on first visit
- Customer data deletion process documented in privacy policy
- Customer data (name, phone, email, address) retained for order history purposes only

---

## 12. Caching Strategy

| Data | Cache Approach | Reason |
|---|---|---|
| Product listings | Next.js `revalidate` — refreshes every 60 seconds | Changes rarely, high read frequency |
| Product variant prices | Next.js `revalidate` — refreshes every 60 seconds | Same |
| LGA shipping rates | Upstash Redis — invalidated when admin updates | High read at checkout, very rarely changes |
| Ythirst impact stats | Next.js `revalidate` — refreshes every 5 minutes | Admin updates manually, no need for instant reflection |
| Orders | No cache — always live | Real-time accuracy required |

---

## 13. Error & Failure Handling

| Scenario | Behaviour |
|---|---|
| Paystack is unreachable at checkout | Clear error message shown: "Payment is temporarily unavailable. Please try again in a few minutes." Order is not created. |
| Paystack payment fails or is cancelled | Customer is returned to checkout with their form data preserved and an error message |
| Resend email fails to send | Order is still created successfully. Failure is logged. Admin is alerted in the staff portal dashboard. Email can be retried. |
| Neon database is unreachable | Shop displays a maintenance page. No broken error screens or stack traces exposed to the user. |
| Cloudinary is unreachable | Product images display a branded placeholder. Layout does not break. |
| Webhook arrives but order already exists | Webhook is logged as duplicate in WebhookEvent table. No second order created. No error thrown. |

---

## 14. Performance

- Next.js App Router with server components where possible (fast initial page load)
- Product images served via Cloudinary CDN with automatic format and size optimisation
- Pages served from Vercel's global CDN
- Core Web Vitals targets: LCP under 2.5s, CLS under 0.1, INP under 200ms

---

## 15. Out of Scope — v1

The following are explicitly excluded from this version and may be considered for future phases:

- Customer accounts and login
- Order tracking page (customers track via Order ID, not a live dashboard)
- Wishlist or saved items
- Product reviews and ratings
- Discount codes or promotions
- SMS notifications
- Delivery tracking or map integration
- Stock management (platform is make-to-order, no stock)
- Multi-city or nationwide delivery (Lagos only at launch)
- Multiple payment providers (Paystack only)
- Product search bar (catalog is small enough at launch)

---

## 16. Pages Summary

| Page | Key Features |
|---|---|
| Homepage | Hero, featured products, Ythirst stats, partner CTA, brand values |
| Products | Grid catalog, category filter, starting price |
| Product Detail | Flavour/size picker, dynamic pricing, add to cart |
| Our Story | Brand narrative, faith mission, Ythirst link |
| Ythirst | Impact stats, outreach narrative, partner CTA |
| Partner | Donation tier cards, subscription flow |
| Cart | Item review, quantity edit, subtotal |
| Checkout | Delivery form, LGA-based shipping, Paystack payment |
| Order Confirmation | Order ID, summary, email confirmation notice |
| Privacy Policy | NDPR compliance document |

---

## 17. Integrations Summary

| Integration | Purpose | Direction |
|---|---|---|
| Paystack | One-time orders and recurring subscriptions | Outbound (payments) + Inbound (webhooks) |
| Resend | Order and subscription confirmation emails | Outbound |
| Cloudinary | Product image delivery | Outbound (read) |
| Neon Postgres via Prisma | All data persistence | Read/Write |
| Upstash Redis | Rate limiting + LGA shipping rate cache | Read/Write |
| Sentry | Error tracking | Outbound |

---

*End of Document — Shop PRD v1.0*
