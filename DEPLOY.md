# Deployment Guide

## API → Railway

### One-time setup (5 min)

```bash
# 1. Login (opens browser)
railway login

# 2. Create a new project linked to this repo
railway init

# 3. Set environment variables
railway variables set DATABASE_URL="postgresql://neondb_owner:npg_Fy0KRxtrdq2u@ep-mute-boat-abrwagty.eu-west-2.aws.neon.tech/neondb?sslmode=require"
railway variables set JWT_SECRET="<generate a 64-char random string>"
railway variables set SEED_DATA="false"
railway variables set STOREFRONT_URL="https://<your-vercel-url>"
railway variables set ALLOWED_ORIGINS="https://<your-vercel-url>"
railway variables set PAYSTACK_SECRET_KEY="<your-paystack-secret-key>"

# 4. Deploy
railway up

# 5. Get your API URL
railway domain
```

### Re-deploy after code changes
```bash
railway up
```

---

## Storefront → Vercel

### One-time setup (3 min)

```bash
# 1. Install Vercel CLI
bun add -g vercel

# 2. Login
vercel login

# 3. Deploy (from the storefront directory)
cd BDP.Storefront
vercel

# When prompted, set these env vars in the Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://<your-railway-url>
# NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = pk_live_b344621ece16998735e8c6b58645c13b99dd2f06
```

### Re-deploy after code changes
```bash
cd BDP.Storefront
vercel --prod
```

---

## Environment Variables Reference

### API (Railway)
| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Random 64-char string |
| `SEED_DATA` | `false` (data already seeded) |
| `STOREFRONT_URL` | Your Vercel URL |
| `ALLOWED_ORIGINS` | Your Vercel URL (comma-separated if multiple) |
| `PAYSTACK_SECRET_KEY` | From Paystack dashboard |
| `PAYSTACK_WEBHOOK_SECRET` | From Paystack dashboard |

### Storefront (Vercel)
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway API URL |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | From Paystack dashboard (pk_live_...) |

---

## JWT:Issuer and JWT:Audience

These are in `appsettings.json`. For Railway, override them as env vars:
```bash
railway variables set "JWT__Issuer"="https://<your-railway-url>"
railway variables set "JWT__Audience"="https://<your-vercel-url>"
```

(Double underscore maps to JSON nesting in ASP.NET Core config.)
