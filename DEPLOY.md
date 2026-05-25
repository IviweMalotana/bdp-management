# Deployment Guide

## Overview
- **API** → Render.com (free Docker hosting, auto-deploys from GitHub)
- **Storefront** → Vercel (free Next.js hosting, auto-deploys from GitHub)

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
| `DATABASE_URL` | `postgresql://neondb_owner:npg_Fy0KRxtrdq2u@ep-mute-boat-abrwagty.eu-west-2.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Generate one: `openssl rand -hex 32` |
| `JWT__Issuer` | `https://bdp-api.onrender.com` |
| `JWT__Audience` | `https://<your-vercel-url>.vercel.app` *(fill in after Step 2)* |
| `SEED_DATA` | `false` |
| `STOREFRONT_URL` | `https://<your-vercel-url>.vercel.app` |
| `ALLOWED_ORIGINS` | `https://<your-vercel-url>.vercel.app` |
| `Paystack__SecretKey` | Your Paystack secret key (sk_live_...) |
| `Paystack__PublicKey` | `pk_live_b344621ece16998735e8c6b58645c13b99dd2f06` |
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
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_live_b344621ece16998735e8c6b58645c13b99dd2f06` |

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

## Local development (reference)

```bash
# API (in one terminal)
$env:DATABASE_URL="postgresql://..."
dotnet run --project BDP.API

# Storefront (in another terminal)
cd BDP.Storefront
bun dev
```
