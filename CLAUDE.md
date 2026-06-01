# BDP Management — Claude Instructions

## Repo Structure

This is a monorepo with three projects:

| Folder | Purpose | Stack |
|--------|---------|-------|
| `BDP.API` | Backend REST API | ASP.NET Core, PostgreSQL (Neon), Railway |
| `BDP.Web` | **Admin management portal** — internal staff only, login-protected | React + Vite + TypeScript, Vercel |
| `BDP.Storefront` | **Customer-facing shop** — public | Next.js 14, Vercel |

**BDP.Web and BDP.Storefront are two completely separate apps with two separate Vercel deployments.**  
Do not mix customer-facing UI into BDP.Web, and do not mix admin UI into BDP.Storefront.

---

## Live URLs

| Service | URL |
|---------|-----|
| API | https://bdp-api-production.up.railway.app |
| Admin portal | *(deploy BDP.Web to its own Vercel project — see below)* |
| Customer storefront | https://bdp-management.vercel.app *(rename this project — see below)* |

---

## Deployment Setup (Two Separate Vercel Projects)

The existing `bdp-management.vercel.app` is currently pointing to `BDP.Storefront`. It needs to be **renamed** to something customer-facing (e.g. `bdp-shop`), and a **new Vercel project** must be created for `BDP.Web` (the admin portal).

### Step 1 — Rename the existing storefront Vercel project

1. Go to **vercel.com** → open the `bdp-management` project
2. Go to **Settings → General → Project Name**
3. Rename it to `bdp-shop` (or `bedifferentpackaging`, or your preferred public name)
4. The URL will become `bdp-shop.vercel.app` (update API env vars accordingly)
5. Confirm the **Root Directory** is set to `BDP.Storefront`
6. Env vars needed:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://bdp-api-production.up.railway.app` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Your Paystack public key (`pk_live_...`) |

---

### Step 2 — Create a new Vercel project for the admin portal

1. Go to **vercel.com** → click **Add New → Project**
2. Import the repo: `IviweMalotana/bdp-management`
3. Set **Root Directory** to: `BDP.Web`
4. Framework will auto-detect as **Vite**
5. Name the project `bdp-management` (this is the internal tool — staff only)
6. Env vars needed:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://bdp-api-production.up.railway.app` |

7. Click **Deploy**
8. The admin portal will be at `bdp-management.vercel.app`

---

### Step 3 — Update the API after renaming the storefront

After the storefront is at its new URL, go to **Railway → bdp-api service → Variables** and update:

| Key | New value |
|-----|-----------|
| `STOREFRONT_URL` | `https://bdp-shop.vercel.app` (your new storefront URL) |
| `ALLOWED_ORIGINS` | `https://bdp-shop.vercel.app,https://bdp-management.vercel.app` |
| `JWT__Audience` | `https://bdp-shop.vercel.app` |
| `Paystack__StorefrontCallbackUrl` | `https://bdp-shop.vercel.app/checkout/success` |

Railway will auto-redeploy after saving.

---

## What Belongs Where

### BDP.Web (admin portal) — staff only
- Dashboard, orders management, status pipeline
- Products, inventory, suppliers, shipments
- Clients (B2B), invoices, recurring orders
- Collections, catalogue import
- Customisation settings, shipping rates
- B2B application approvals
- All routes protected by JWT login (`/login` is the only public route)

### BDP.Storefront (customer shop) — public
- Shop, product pages, collections
- Cart, checkout (Paystack payments)
- Customer accounts, order tracking
- B2B registration
- About, contact, customise pages
- Multi-currency display

**Never add storefront/shop pages to BDP.Web. Never add admin pages to BDP.Storefront.**

---

## Order Status Flow

Orders move through these stages:

**Standard:** `Placed` → `Processing` → `Ready to Ship` → `Shipped` → `Delivered`

**With customisation:** `Placed` → `Processing` → `Customisation Accepted` → `Ready to Ship` → `Shipped` → `Delivered`

`Cancelled` is always available as an option.

In the admin portal (`BDP.Web`), the order detail page shows a visual clickable pipeline — click any stage to move the order there instantly. The `Customisation Accepted` stage only appears when the order contains items with a customisation option.

---

## Processing Time

Wherever order processing time is advertised in the storefront, it must say:

> **Orders dispatched within 2–3 business days**

This is displayed:
- On every product page (below the Add to Cart button)
- On the checkout page (below the shipping options)

---

## Local Development

```bash
# API (terminal 1)
cd BDP.API
dotnet run

# Admin portal (terminal 2)
cd BDP.Web
npm install && npm run dev
# Runs at http://localhost:5173

# Storefront (terminal 3)
cd BDP.Storefront
bun install && bun dev
# Runs at http://localhost:3000
```

Set these env vars for local development:

**BDP.Web** — create `BDP.Web/.env.development`:
```
VITE_API_URL=http://localhost:5252
```

**BDP.Storefront** — create `BDP.Storefront/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5252
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
```

---

## Database

PostgreSQL on Neon (eu-west-2). Set `DATABASE_URL` in Railway (production) or as an env var locally.

The API seeds initial data on startup when `SEED_DATA=true`. Only use this on a fresh database.

---

## Key Tech Decisions

- **Payments:** Paystack (South Africa) — webhook at `/api/webhooks/paystack`
- **Shipping from China:** YunExpress SOAP API — credentials in Railway as `YunExpress__AppKey` / `YunExpress__AppToken`
- **Email:** Configured via `Email__*` env vars in Railway
- **Currency:** IP-based detection with manual selector fallback
- **Auth:** JWT — tokens issued by `BDP.API`, consumed by both `BDP.Web` and `BDP.Storefront`
