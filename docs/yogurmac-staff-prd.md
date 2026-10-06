# Product Requirements Document
## Yogurmac Foods — Staff & Admin Portal
### `staff.yogurmacfoods.com`

**Version:** 1.0  
**Status:** Locked  
**Prepared for:** Yogurmac Foods Limited  

---

## 1. Overview

This document specifies the complete requirements for the internal staff and admin portal for Yogurmac Foods Limited at `staff.yogurmacfoods.com`.

The portal serves two distinct roles on a single application:

- **Admin** — the business owner. Manages products, orders, subscriptions, analytics, Ythirst impact numbers, and all staff activity
- **Staff** — employees (up to 30). Execute production orders, log daily activity, report setbacks, complete admin-set review check-ins, and receive task assignments and announcements

Both roles log in through the same URL. The system detects their role and routes them to their respective dashboard automatically.

---

## 2. Objectives

- Give the admin a single place to run all business operations — products, orders, analytics, subscriptions, and staff management
- Give staff a clear daily interface — what to make, what tasks to complete, and where to report issues
- Support the admin's ability to set review questions, define expected outcomes, and monitor staff responses over time
- Connect directly to the shop database so order changes made here are reflected on the shop immediately
- Keep the interface simple enough for staff of varying technical ability to use confidently

---

## 3. User Personas

### 3.1 Admin (Business Owner)
The sole admin of the platform. She oversees everything — from what products appear on the store to how staff are performing. She is not a developer. Every function she uses must be presented in plain language with no technical exposure.

### 3.2 Staff (Employee)
A production, packaging, or operations employee. Up to 30 active staff at a time. They use the portal daily to view their production queue, log activity, and respond to check-ins. They have no visibility into sales data, subscriptions, customer information beyond what's needed to make an order, or other staff members' records.

---

## 4. Authentication & Access

### 4.1 Login
- Single login page at `staff.yogurmacfoods.com/login`
- Email and password credentials
- On successful login, the system reads the user's role from the database and redirects:
  - Admin → `/admin/dashboard`
  - Staff → `/staff/dashboard`
- Failed login attempts are rate-limited (maximum 5 attempts per 10 minutes per IP)
- Sessions expire after 8 hours of inactivity
- Sessions are stored in secure, httpOnly cookies — not accessible by JavaScript

### 4.2 Account Creation
- Staff cannot self-register
- Admin creates a staff account from the admin dashboard by entering the staff member's name and email
- The system sends an invite email via Resend containing a one-time setup link
- The invite link expires after 24 hours
- Staff member clicks the link, sets their password, and their account is activated
- If the link expires, the admin can resend the invite from the same staff management screen

### 4.3 Account Deactivation
- Admin can deactivate any staff account instantly from the staff management screen
- Deactivated accounts cannot log in
- Any active session for that account is invalidated immediately
- Deactivated accounts remain in the database for audit purposes — they are not deleted

### 4.4 Role Enforcement
- Every page and API route checks the user's session and role server-side before rendering or executing
- A staff member who manually navigates to an admin URL receives a 403 page
- No role logic is trusted from the client side

---

## 5. Application Structure

### Admin Routes

| Route | Page |
|---|---|
| `/admin/dashboard` | Overview dashboard |
| `/admin/orders` | Order management |
| `/admin/orders/[orderId]` | Order detail |
| `/admin/products` | Product management |
| `/admin/products/new` | Add new product |
| `/admin/products/[id]/edit` | Edit product |
| `/admin/delivery` | LGA shipping rate management |
| `/admin/analytics` | Sales analytics |
| `/admin/subscriptions` | Subscription and donation tracking |
| `/admin/ythirst` | Ythirst impact stat management |
| `/admin/staff` | Staff account management |
| `/admin/staff/[id]` | Individual staff member view |
| `/admin/reviews` | Review question management |
| `/admin/tasks` | Task assignment |
| `/admin/announcements` | Broadcast announcements |

### Staff Routes

| Route | Page |
|---|---|
| `/staff/dashboard` | Staff overview |
| `/staff/queue` | Order production queue |
| `/staff/queue/[orderId]` | Order detail for production |
| `/staff/tasks` | Assigned tasks |
| `/staff/log` | Daily activity log |
| `/staff/review` | Review check-in |
| `/staff/announcements` | Announcements |

---

## 6. Admin Feature Specifications

### 6.1 Admin Dashboard `/admin/dashboard`

**Purpose:** At-a-glance view of the business today.

**Widgets displayed:**
- Orders today — total count and total revenue
- Orders by status — count per status (Confirmed / In Production / Ready / Out for Delivery / Delivered)
- Active subscriptions — total count and total monthly donation value
- Recent orders — last 10 orders with Order ID, customer name, LGA, total, and current status
- Failed notification alerts — any order confirmation emails that failed to send, with a resend button
- Staff on duty today — count of staff who have submitted a daily activity log today

---

### 6.2 Order Management `/admin/orders`

**Purpose:** View and manage all customer orders.

**List view:**
- Paginated table of all orders, newest first
- Columns: Order ID, customer name, phone, LGA, items (summary), total, status, date placed
- Filterable by: status, LGA, date range
- Searchable by: Order ID, customer name, phone number

**Order detail `/admin/orders/[orderId]`:**
- Full customer details: name, email, phone, LGA, exact address, landmark
- Itemised order: product name, flavour, size, quantity, unit price, line total
- Subtotal, shipping fee, order total
- Current status displayed with full status timeline
- Status update control — dropdown or button group to move order to the next status
- When status is changed to OUT_FOR_DELIVERY:
  - A WhatsApp click-to-chat button appears, pre-filled with the customer's phone number and a delivery message containing their name, Order ID, and address
  - Admin clicks the button, WhatsApp opens with the message ready, admin presses send
  - The button is labelled: "Send WhatsApp Delivery Notice"
- Production notes — any setback reports submitted by staff against this order are visible here
- Audit trail — timestamped log of every status change and who made it

---

### 6.3 Product Management `/admin/products`

**Purpose:** Admin manages everything that appears in the store.

**Product list:**
- All products in a table: name, category, number of variants, featured status, active status
- Toggle to activate or deactivate a product (inactive products disappear from the shop immediately)
- Toggle to mark as featured (appears on homepage)
- Edit and delete buttons per product

**Add new product `/admin/products/new`:**

Fields:
- Product name (required)
- Slug (auto-generated from name, editable)
- Category — dropdown: Yogurt / Granola / Energy Bar
- Description (required)
- Images — upload up to 5 images via Cloudinary. Drag to reorder. First image is the primary display image
- Featured — toggle
- Active — toggle (defaults to active)
- Variants section

**Variant management (within product form):**
- Admin adds as many size/flavour combinations as the product has
- Each variant row has: Flavour (text input), Size (text input), Price (number input), Available toggle
- Admin can add more variant rows or remove existing ones
- At least one variant is required to save a product

**Edit product `/admin/products/[id]/edit`:**
- Same form as Add, pre-populated with existing data
- Changing a variant price does not affect past orders (unit price is snapshotted at order time)
- Deleting a variant that exists in past orders marks it as unavailable, not physically deleted

**File upload requirements:**
- Accepted formats: JPG, PNG, WEBP only
- Maximum file size: 5MB per image
- Images are uploaded directly to Cloudinary from the browser — they never touch the Next.js server
- Cloudinary returns a URL which is saved to the database

---

### 6.4 Delivery Pricing `/admin/delivery`

**Purpose:** Set and update shipping fees per LGA.

**Display:**
- A table listing all 20 Lagos LGAs with their current shipping fee
- Each row is editable inline — admin clicks the fee, types a new amount, saves
- Changes take effect immediately — the checkout reads the latest value from the cache (Upstash Redis), which is invalidated on every save

**The 20 LGAs:**
Agege, Ajeromi-Ifelodun, Alimosho, Amuwo-Odofin, Apapa, Badagry, Epe, Eti-Osa, Ibeju-Lekki, Ifako-Ijaiye, Ikeja, Ikorodu, Kosofe, Lagos Island, Lagos Mainland, Mushin, Ojo, Oshodi-Isolo, Shomolu, Surulere

---

### 6.5 Sales Analytics `/admin/analytics`

**Purpose:** Give the admin visibility into business performance over time.

**Sections:**

**Revenue Overview**
- Total revenue — today / this week / this month / this year
- Revenue trend chart — daily revenue plotted over the selected time range
- Time range selector: Last 7 days / Last 30 days / Last 3 months / This year / Custom range

**Orders**
- Total orders in selected period
- Orders by status breakdown (counts and percentages)
- Orders per day chart

**Products**
- Top-selling products by units and by revenue in the selected period
- Top-selling variants (flavour + size combinations) by units

**Delivery**
- Orders by LGA — a breakdown showing which local government areas generate the most orders
- Useful for understanding delivery concentration and rider routing

**Subscriptions & Donations**
- Total active subscribers
- New subscribers this month
- Total donation revenue this month and this year
- Subscriber breakdown by tier

---

### 6.6 Subscription & Partnership Management `/admin/subscriptions`

**Purpose:** Manage donation tiers and track active partners.

**Tier management:**
- List of all donation tiers with name, description, monthly amount, active subscriber count, active/inactive status
- Create new tier — name, description, monthly amount. On save, a Paystack Plan is created via the Paystack API and the plan code is stored against the tier
- Edit tier — name and description can be edited. Monthly amount cannot be changed after subscribers exist (to protect existing subscribers' billing)
- Deactivate tier — hides it from the shop. Existing subscribers on that tier continue until they cancel

**Subscriber list:**
- Table of all active subscribers: name, email, tier, monthly amount, subscription start date, next payment date, status
- Filterable by tier and status (Active / Cancelled / Expired)
- Individual subscriber view shows full payment history

---

### 6.7 Ythirst Impact Management `/admin/ythirst`

**Purpose:** Update the three public-facing impact numbers.

**Display:**
- Three fields, each with a label and a current value:
  - Children Reached — current value, number input to update
  - Outreach Campaigns Completed — current value, number input to update
  - Schools Visited — current value, number input to update
- "Save Changes" button — updates the database and immediately reflects on the public shop

**Audit:**
- Each update is logged in the audit trail with the previous value, new value, and timestamp

---

### 6.8 Staff Management `/admin/staff`

**Purpose:** Create and manage staff accounts, monitor activity.

**Staff list:**
- Table: staff name, email, role (always Staff), account status (Active / Deactivated), date joined, last active date
- "Invite Staff Member" button — opens a form to enter name and email, sends invite link via Resend
- Deactivate button per staff member — immediately revokes access
- Click through to individual staff member view

**Individual staff member `/admin/staff/[id]`:**
- Profile: name, email, join date, last active
- Activity summary: total orders produced, total tasks completed, daily logs submitted this month
- Review responses: all review check-in submissions from this staff member, shown against the question and the admin-set expected outcome
- Task history: tasks assigned, completed, and any blockers raised
- Setback reports: all setbacks filed by this staff member with the associated order reference

---

### 6.9 Review Question Management `/admin/reviews`

**Purpose:** Admin sets performance check-in questions for staff to answer on a regular cadence.

**Review configuration:**
- Cadence selector — admin sets how often staff are prompted to complete a review: Daily / Weekly / Bi-weekly / Monthly
- The system enforces the cadence — staff see a review check-in prompt on their dashboard when one is due

**Question management:**
- Admin creates a set of questions. Each question has:
  - Question text (required)
  - Expected outcome (required) — what a satisfactory answer should demonstrate. Visible only to the admin, never to staff
  - Question type — Short answer / Long answer (for this version, all responses are free-text)
- Admin can add, edit, reorder, and remove questions
- Changes to questions take effect on the next review cycle — in-progress cycles use the questions that were active when they started
- Questions are presented to all staff — there is no per-staff question customisation in v1

**Monitoring responses:**
- From `/admin/staff/[id]`, the admin sees each staff member's review submissions
- Each submission shows the question, the staff member's response, and the admin's defined expected outcome side by side
- Admin can add a private note against any response (visible only to admin)

---

### 6.10 Task Assignment `/admin/tasks`

**Purpose:** Admin assigns specific tasks to individual staff members or the whole team.

**Create task:**
- Title (required)
- Description (optional)
- Assigned to — select a specific staff member, or "All Staff" to appear in everyone's task board
- Due date (optional)

**Task list:**
- All tasks with assignee, status (Pending / In Progress / Completed / Blocked), and due date
- Filter by assignee and status
- Click through to see task detail and any blocker notes raised by staff

---

### 6.11 Announcements `/admin/announcements`

**Purpose:** Admin broadcasts messages to all staff.

**Create announcement:**
- Title (required)
- Body text (required)
- Post immediately or schedule for a future date/time

**Announcement list:**
- All past announcements with date, title, and how many staff have viewed them

---

## 7. Staff Feature Specifications

### 7.1 Staff Dashboard `/staff/dashboard`

**Purpose:** Staff member's daily home screen.

**Displayed:**
- Greeting with staff member's name
- Pending review check-in alert — if a review is due today, a prominent banner with a "Complete Check-In" CTA
- Unread announcements — count and link
- My tasks today — tasks assigned to this staff member that are pending or in progress
- Orders in queue — count of orders currently sitting in CONFIRMED status waiting to be claimed
- My active order — if the staff member has claimed an order and it is IN_PRODUCTION, it is shown prominently here

---

### 7.2 Order Production Queue `/staff/queue`

**Purpose:** Shared queue of all orders that need to be made.

**Queue behaviour:**
- Displays all orders with status CONFIRMED, sorted by date placed (oldest first — first in, first out)
- Each order card shows: Order ID, items to make (product name, flavour, size, quantity for each line), date ordered
- Customer personal details (name, phone, address) are NOT shown to staff — they only see what to make
- Staff clicks "Claim Order" to take ownership of an order
- Once claimed, the order moves to IN_PRODUCTION and disappears from the shared queue for other staff
- A staff member can only have one order IN_PRODUCTION at a time — they must mark it ready before claiming another

**Order detail `/staff/queue/[orderId]`:**
- Full production detail: items, flavours, sizes, quantities
- "Mark as Ready" button — moves order to READY status, releases the staff member to claim another
- "Report Setback" button — opens a form to describe an issue without blocking production. The setback is logged against the order and visible to admin. The order status does not change — staff continue working while admin is informed

**Setback report form:**
- Order ID (auto-filled)
- Nature of setback — dropdown: Ingredient shortage / Equipment issue / Packaging issue / Other
- Description — free text
- Submit

---

### 7.3 Task Board `/staff/tasks`

**Purpose:** View and act on tasks assigned by admin.

**Display:**
- Three columns: Pending / In Progress / Completed
- Each task card shows: title, description, due date (if set)
- Staff can drag a task from Pending to In Progress to Completed
- "Raise Blocker" button on any task — opens a short text field to describe what is blocking completion. Blocker is saved and visible to admin. Task moves to Blocked status.

---

### 7.4 Daily Activity Log `/staff/log`

**Purpose:** Staff log their general activity for the day — anything outside of specific production orders and assigned tasks.

**Behaviour:**
- One log entry per day per staff member
- Free-text field: "What did you work on today?"
- Optional: general setbacks or observations not tied to a specific order
- Submit locks the log for the day — it can be edited up to 1 hour after submission, then becomes read-only
- Staff can view their past logs (read-only)

---

### 7.5 Review Check-In `/staff/review`

**Purpose:** Staff answer the review questions set by admin on the configured cadence.

**Behaviour:**
- When a review is due (based on the cadence the admin has set), a prompt appears on the staff dashboard
- Staff click through to the check-in page
- Questions are displayed one at a time or all on one page (configured by admin)
- Each question has a free-text response field
- Staff submit all answers at once
- Submitted responses are final — staff cannot edit after submission
- If the review cadence has passed and no submission was made, it is logged as missed. Admin can see missed check-ins on the staff member's profile
- Staff can see their own past submissions (read-only)

---

### 7.6 Announcements `/staff/announcements`

**Purpose:** Staff read broadcasts from the admin.

**Behaviour:**
- List of all announcements, newest first
- Unread announcements are visually highlighted
- Opening an announcement marks it as read — logged against that staff member
- Staff cannot reply to announcements

---

## 8. Data Models

### User
```
id              String  (primary key)
name            String
email           String  (unique)
passwordHash    String
role            Enum    (ADMIN / STAFF)
isActive        Boolean
inviteToken     String? (one-time invite link token)
inviteExpiry    DateTime?
lastActiveAt    DateTime?
createdAt       DateTime
updatedAt       DateTime
```

### ReviewCycle
```
id              String  (primary key)
cadence         Enum    (DAILY / WEEKLY / BIWEEKLY / MONTHLY)
startDate       DateTime
endDate         DateTime?
isActive        Boolean
createdAt       DateTime
```

### ReviewQuestion
```
id              String  (primary key)
cycleId         String  (foreign key → ReviewCycle)
questionText    String
expectedOutcome String  (admin-only, never shown to staff)
order           Int     (display order)
createdAt       DateTime
updatedAt       DateTime
```

### ReviewSubmission
```
id              String  (primary key)
cycleId         String  (foreign key → ReviewCycle)
staffId         String  (foreign key → User)
submittedAt     DateTime
isMissed        Boolean (true if cadence passed without submission)
createdAt       DateTime
```

### ReviewResponse
```
id              String  (primary key)
submissionId    String  (foreign key → ReviewSubmission)
questionId      String  (foreign key → ReviewQuestion)
responseText    String
adminNote       String? (admin's private note against this response)
createdAt       DateTime
```

### Task
```
id              String  (primary key)
title           String
description     String?
assignedTo      String? (foreign key → User — null means all staff)
dueDate         DateTime?
status          Enum    (PENDING / IN_PROGRESS / COMPLETED / BLOCKED)
blockerNote     String?
createdBy       String  (foreign key → User — always admin)
createdAt       DateTime
updatedAt       DateTime
```

### DailyLog
```
id              String  (primary key)
staffId         String  (foreign key → User)
logDate         Date    (unique per staff per day)
activityText    String
generalSetbacks String?
submittedAt     DateTime
editableUntil   DateTime (submittedAt + 1 hour)
createdAt       DateTime
```

### SetbackReport
```
id              String  (primary key)
orderId         String  (foreign key → Order)
staffId         String  (foreign key → User)
category        Enum    (INGREDIENT_SHORTAGE / EQUIPMENT_ISSUE / PACKAGING_ISSUE / OTHER)
description     String
createdAt       DateTime
```

### Announcement
```
id              String  (primary key)
title           String
body            String
scheduledFor    DateTime
publishedAt     DateTime?
createdBy       String  (foreign key → User — always admin)
createdAt       DateTime
```

### AnnouncementRead
```
id              String  (primary key)
announcementId  String  (foreign key → Announcement)
staffId         String  (foreign key → User)
readAt          DateTime
```

### OrderClaim
```
id              String  (primary key)
orderId         String  (unique — one active claim per order)
staffId         String  (foreign key → User)
claimedAt       DateTime
markedReadyAt   DateTime?
```

Links a staff member to an order they have claimed from the production queue.

### AuditLog
```
id              String  (primary key)
actorId         String  (foreign key → User — who did it)
action          String  (e.g. ORDER_STATUS_CHANGED, PRODUCT_CREATED, SHIPPING_RATE_UPDATED)
entityType      String  (e.g. Order, Product, LGAShippingRate)
entityId        String  (the ID of the record that changed)
previousValue   Json?   (what it was before)
newValue        Json?   (what it became)
createdAt       DateTime
```

Every consequential admin action is recorded here.

---

## 9. Order Flow — Staff Portal Perspective

```
New order arrives from shop (status: CONFIRMED)
        ↓
Order appears in shared production queue on /staff/queue
        ↓
Any available staff member clicks "Claim Order"
        ↓
Order moves to IN_PRODUCTION
        ↓
Order disappears from shared queue — claimed by that staff member
        ↓
Staff member produces the order
        ↓
If setback occurs → staff files a setback report (order stays IN_PRODUCTION, admin is alerted)
        ↓
Staff clicks "Mark as Ready" → order moves to READY
        ↓
Admin sees order is READY in order management
        ↓
Admin arranges rider pickup
        ↓
Admin moves order to OUT_FOR_DELIVERY → WhatsApp click-to-chat button appears
        ↓
Admin sends WhatsApp message to customer manually
        ↓
Rider delivers → Admin moves order to DELIVERED
```

---

## 10. Security Requirements

### Authentication
- Passwords hashed with bcrypt (minimum 12 rounds)
- Invite tokens are cryptographically random (minimum 32 bytes), stored as a hash, single-use
- Sessions expire after 8 hours, stored in httpOnly secure cookies
- Deactivated account sessions are invalidated server-side immediately

### Authorisation
- Every admin route and API endpoint verifies: (a) valid session exists, (b) role is ADMIN
- Every staff route and API endpoint verifies: (a) valid session exists, (b) role is STAFF
- Staff cannot access, query, or modify: customer personal details beyond order items, other staff members' logs or responses, sales analytics, subscription data, or any admin function

### Input Validation
- Zod validation on every form submission and API route
- Product descriptions and announcement bodies are sanitised before storage to prevent XSS

### File Uploads
- Accepted formats: JPG, PNG, WEBP only
- Maximum 5MB per file
- Files uploaded directly to Cloudinary — server never handles the raw file
- Cloudinary URL is the only thing stored in the database

### Audit Trail
- All admin actions are logged to AuditLog — this cannot be disabled or cleared from the UI
- Log entries are insert-only — they cannot be edited or deleted

### CSRF
- Next.js App Router CSRF protection explicitly configured on all mutation routes

### Rate Limiting
- Login endpoint: 5 attempts per 10 minutes per IP
- Invite resend: 3 per hour per admin

---

## 11. Error & Failure Handling

| Scenario | Behaviour |
|---|---|
| Staff tries to claim a second order while one is IN_PRODUCTION | Button is disabled, message shown: "Mark your current order as Ready before claiming another." |
| Two staff click "Claim Order" on the same order simultaneously | Database-level constraint ensures only one claim succeeds. The second staff member sees: "That order was just claimed by someone else." |
| Invite email fails to send | Admin is shown an error and can retry. Account is not created until the staff member sets their password via the link. |
| Admin tries to delete a product variant that exists in past orders | Variant is marked unavailable (not deleted). Admin is informed: "This variant has existing orders and cannot be deleted. It has been marked unavailable instead." |
| Session expires mid-action | User is redirected to login with a "Your session has expired" message. No data is lost. |
| Paystack API is unreachable when creating a subscription tier | Admin sees a clear error. Tier is not created in the database. Admin can retry. |

---

## 12. Out of Scope — v1

The following are explicitly excluded from this version:

- Staff-to-staff messaging or internal chat
- Mobile app (portal is web-only, must be mobile-responsive)
- Payroll or shift management
- Delivery rider tracking or assignment
- Staff self-service password reset (admin resets via deactivate and re-invite in v1)
- Per-staff review question customisation (all staff see the same questions)
- Automated review scoring (admin judges responses manually)
- Attendance / clock-in system
- Leave requests
- Export to Excel or CSV (may be added in a later phase)

---

## 13. Integrations Summary

| Integration | Purpose | Direction |
|---|---|---|
| Neon Postgres via Prisma | All data persistence | Read/Write |
| NextAuth | Session management and auth | Internal |
| Resend | Staff invite emails | Outbound |
| Cloudinary | Product image upload and storage | Outbound |
| Paystack | Creating subscription tier plans | Outbound |
| Upstash Redis | Rate limiting (login, invite resend) | Read/Write |
| Sentry | Error tracking | Outbound |

---

## 14. Pages Summary

### Admin Pages

| Page | Purpose |
|---|---|
| Dashboard | Business overview — orders, revenue, active subs, staff activity |
| Order Management | View all orders, filter, search, update status, send WhatsApp |
| Order Detail | Full customer and item detail, status pipeline, audit trail |
| Product Management | List, activate/deactivate, feature products |
| Add / Edit Product | Upload product, manage variants and pricing |
| Delivery Pricing | Set shipping fee per LGA |
| Analytics | Revenue, orders, products, LGA breakdown, subscriptions |
| Subscription Management | Manage tiers, view active subscribers |
| Ythirst Management | Update children reached, campaigns, schools |
| Staff Management | View all staff, invite new staff, deactivate accounts |
| Staff Detail | Individual activity, review responses, task and setback history |
| Review Questions | Set cadence, create and manage check-in questions with outcomes |
| Task Assignment | Create and assign tasks, monitor completion |
| Announcements | Create and schedule broadcasts to all staff |

### Staff Pages

| Page | Purpose |
|---|---|
| Dashboard | Daily overview — due check-ins, pending tasks, queue count |
| Production Queue | Shared order queue, claim and produce orders |
| Order Detail | What to make, mark ready, report setback |
| Task Board | View assigned tasks, update status, raise blockers |
| Daily Activity Log | Log the day's general work |
| Review Check-In | Answer admin-set questions on configured cadence |
| Announcements | Read broadcasts from admin |

---

*End of Document — Staff Portal PRD v1.0*
