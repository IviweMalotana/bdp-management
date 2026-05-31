# Deployment Guide

## Live URLs
| Service | URL |
|---------|-----|
| **API** | https://bdp-api-production.up.railway.app |
| **Storefront** | https://bdp-management.vercel.app |
| **Database** | Neon PostgreSQL (eu-west-2) |

## Overview
- **API** → Railway (`stunning-commitment` project, `bdp-api` service)
- **Storefront** → Vercel (`bdp-management.vercel.app`)

---

## Step 1 — Deploy the API on Render

### 1.1 Create the service (one-time, ~3 min)

1. Go to **https://render.com** → sign in with GitHub
2. Click **New → Web Service**
3. Connect the repo: `IviweMalotana/bdp-management`
4. Set these options:
   - **Name:** `bdp-api`
   - **Root Directory:** *(leave blank — Dockerfile is at repo root)*
   - **Runtime:** `Docker`
   - **Branch:** `main`
   - **Plan:** Free (or Starter $7/mo for no cold starts)
5. Click **Create Web Service** — Render will start building

### 1.2 Set environment variables (Render dashboard → Environment tab)

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:YOUR_NEON_PASSWORD_HERE@ep-xxx.eu-west-2.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Generate one: `openssl rand -hex 32` |
| `JWT__Issuer` | `https://bdp-api.onrender.com` |
| `JWT__Audience` | `https://<your-vercel-url>.vercel.app` *(fill in after Step 2)* |
| `SEED_DATA` | `false` |
| `STOREFRONT_URL` | `https://<your-vercel-url>.vercel.app` |
| `ALLOWED_ORIGINS` | `https://<your-vercel-url>.vercel.app` |
| `Paystack__SecretKey` | Your Paystack secret key (sk_live_...) |
| `Paystack__PublicKey` | `pk_test_YOUR_PAYSTACK_PUBLIC_KEY_HERE` (or pk_live_... for production) |
| `Paystack__StorefrontCallbackUrl` | `https://<your-vercel-url>.vercel.app/checkout/success` |

6. Click **Save Changes** → Render will redeploy automatically
7. Your API URL will be: `https://bdp-api.onrender.com`

> **Note:** Free tier spins down after 15 min of inactivity (cold start ~30s).
> Upgrade to Starter ($7/mo) to keep it always-on.

---

## Step 2 — Deploy the Storefront on Vercel

### 2.1 Create the project (one-time, ~2 min)

1. Go to **https://vercel.com** → sign in with GitHub
2. Click **Add New → Project**
3. Import the repo: `IviweMalotana/bdp-management`
4. Set **Root Directory** to: `BDP.Storefront`
5. Framework will auto-detect as **Next.js**
6. Click **Deploy**

### 2.2 Set environment variables (Vercel dashboard → Settings → Environment Variables)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://bdp-api.onrender.com` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_test_YOUR_PAYSTACK_PUBLIC_KEY_HERE` (or the live key for production) |

7. After adding the env vars, click **Redeploy** (top right of the deployment page)
8. Your storefront URL will be something like: `https://bdp-management.vercel.app`

---

## Step 3 — Wire them together

Once you have both URLs:

1. Go back to **Render → Environment** and update:
   - `JWT__Audience` → your Vercel URL
   - `STOREFRONT_URL` → your Vercel URL
   - `ALLOWED_ORIGINS` → your Vercel URL
   - `Paystack__StorefrontCallbackUrl` → `https://<vercel-url>/checkout/success`

2. Render will auto-redeploy. Done.

---

## Auto-deploys going forward

Every `git push origin main` will:
- Trigger a new Render build (API)
- Trigger a new Vercel build (Storefront)

No manual steps needed.

---

## Generating a JWT secret

```bash
# In any terminal:
openssl rand -hex 32
```

Or use: https://generate-secret.vercel.app/32

---

## Secrets & Environment Variables (Critical)

**Never commit real secrets.** The following rules are enforced by `.gitignore`:

- All `.env*` files (except `.env.example`)
- `appsettings.*.json` (except the base `appsettings.json` and `appsettings.Development.json`)
- `secrets/` folders, `*.pem`, `*.key`, etc.

### For local development (recommended approach)

**Backend (.NET)**
- Use [.NET User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) for anything sensitive:
  ```bash
  dotnet user-secrets init --project BDP.API
  dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=bdp_dev;Username=postgres;Password=postgres" --project BDP.API
  dotnet user-secrets set "JWT:Secret" "$(openssl rand -hex 32)" --project BDP.API
  # Add Paystack, YunExpress, OpenAI, Email, etc. as needed
  ```
- Or set environment variables at the terminal:
  ```powershell
  $env:DATABASE_URL = "postgresql://..."
  $env:JWT_SECRET = "your-32-char-secret"
  dotnet run --project BDP.API
  ```

**Frontends**
- Copy the example files and rename:
  - `BDP.Web`: `cp .env.example .env.development`
  - `BDP.Storefront`: `cp .env.example .env.local`
- Fill in your local values. These files are ignored by git.

### Production / Deployment

All real secrets must be set in the platform dashboards (Railway, Vercel, etc.):

| Variable                        | Where to set it                  | Notes |
|--------------------------------|----------------------------------|-------|
| `DATABASE_URL`                 | Railway (or Render)              | Full Postgres connection string |
| `JWT_SECRET`                   | Railway                          | Use `openssl rand -hex 32` |
| `Paystack__SecretKey`          | Railway                          | `sk_live_...` or `sk_test_...` |
| `Paystack__PublicKey`          | Railway + Vercel                 | `pk_live_...` or `pk_test_...` |
| `YunExpress:AppKey` / `AppToken` | Railway                        | Only if using live shipping rates |
| `OpenAI:ApiKey`                | Railway                          | For AI content generation |
| `NEXT_PUBLIC_API_URL`          | Vercel (Storefront)              | Your Railway API URL |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Vercel                       | Must match the backend key |

**After changing any secret in production, redeploy the affected service.**

---

## Local development (reference)

```bash
# API (in one terminal)
$env:DATABASE_URL="postgresql://..."
dotnet run --project BDP.API

# Storefront (in another terminal)
cd BDP.Storefront
bun dev

# Web admin (in another terminal)
cd BDP.Web
bun dev
```

