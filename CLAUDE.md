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
| Admin portal | https://admin.bedifferentpackaging.com (BDP.Web — staff only) |
| Customer storefront | https://www.bedifferentpackaging.com (BDP.Storefront — public) |

Both Vercel projects use custom HostKing-managed domains:
- `www.bedifferentpackaging.com` (+ apex `bedifferentpackaging.com`) → storefront
- `admin.bedifferentpackaging.com` → admin portal

The legacy `*.vercel.app` URLs are kept as fallbacks during transition.

---

## Deployment Setup (Two Separate Vercel Projects)

Two separate Vercel projects, both on custom domains managed via HostKing DNS:

| Vercel project | Root Directory | Domain |
|----------------|----------------|--------|
| Storefront | `BDP.Storefront` | `www.bedifferentpackaging.com` (+ apex) |
| Admin portal | `BDP.Web` | `admin.bedifferentpackaging.com` |

### DNS (HostKing)

| Record | Host | Value |
|--------|------|-------|
| A | `@` | `216.198.79.1` (Vercel) |
| CNAME | `www` | `fb870c8843381a54.vercel-dns-017.com.` |
| CNAME | `admin` | `4bcafb9c376a376f.vercel-dns-017.com.` |

### Vercel env vars

**Storefront project:**

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://bdp-api-production.up.railway.app` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key (`pk_live_...`) |

**Admin portal project:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://bdp-api-production.up.railway.app` |

### Railway (bdp-api service) env vars

| Key | Value |
|-----|-------|
| `STOREFRONT_URL` | `https://www.bedifferentpackaging.com` |
| `ALLOWED_ORIGINS` | `https://www.bedifferentpackaging.com,https://admin.bedifferentpackaging.com` (legacy `*.vercel.app` URLs kept during transition) |
| `JWT__Audience` | `https://www.bedifferentpackaging.com` |
| `Paystack__StorefrontCallbackUrl` | `https://www.bedifferentpackaging.com/checkout/success` |

Railway auto-redeploys after saving.

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
