# BDP — HostKing VPS Deployment Runbook

Run all of BDP on a single HostKing Linux VPS, under `bedifferentpackaging.com`,
with mailboxes + DNS staying on the managed HostKing Starter plan.

## What runs where (on the one VPS)

| Hostname | Served by | Process |
|---|---|---|
| `api.bedifferentpackaging.com` | ASP.NET Core API (.NET 8) | Kestrel on `127.0.0.1:5000`, `systemd` |
| `www` + apex `bedifferentpackaging.com` | Next.js 16 storefront | `next start` on `127.0.0.1:3000`, `systemd` |
| `admin.bedifferentpackaging.com` | React/Vite admin (static) | Nginx serves `/var/www/admin` |
| PostgreSQL | local DB | `localhost:5432` (migrated from Neon) |

Nginx terminates TLS (Let's Encrypt) for all three hostnames and reverse-proxies
the two apps. Email keeps flowing: mailboxes stay on HostKing (MX untouched),
and the API sends transactional mail via Resend over HTTPS (just env vars).

## Order of operations

1. **Buy the VPS** (Ubuntu 22.04/24.04 LTS, ≥2 GB RAM since we build off-server;
   4 GB if you'd rather build on the box). Note its public IP + root SSH.
2. **Provision it:** copy this `deploy/` folder up and run `setup-server.sh` as root.
   Installs .NET 8 runtime, Node 20 + bun, PostgreSQL, Nginx, Certbot, firewall.
3. **Create the database** and a role (the script prints the commands).
4. **Fill in env files** on the server from the `env/*.example` templates →
   `/etc/bdp/bdp-api.env` and `/etc/bdp/storefront.env`. Copy every secret from
   your current Railway/Vercel dashboards.
5. **Migrate the data:** run `migrate-db.sh` (dumps Neon, restores into VPS Postgres).
6. **Install the services:** copy `systemd/*.service` to `/etc/systemd/system/`,
   then `systemctl enable --now bdp-api bdp-storefront`.
7. **Install the Nginx site:** copy `nginx/bedifferentpackaging.conf` to
   `/etc/nginx/sites-available/`, symlink into `sites-enabled`, `nginx -t`, reload.
8. **Deploy the apps:** from your dev machine run `deploy.sh` (builds API +
   storefront + admin locally, rsyncs to the VPS, restarts services).
9. **Point DNS** (at HostKing): A records `@`, `www`, `api`, `admin` → VPS IP.
   **Leave MX records alone.** Then run Certbot to issue SSL (script step prints it).
10. **Verify** (storefront → API → DB, admin login, test Paystack order/webhook,
    a test email), then **cancel Railway** and pause the Vercel projects.

## Notes
- **Uploads are now persistent.** `wwwroot/uploads` (artwork) and
  `wwwroot/invoices` survive restarts on the VPS — `deploy.sh` never deletes them.
- **Build off-server** by default to keep a small VPS from OOM-ing on
  `next build`. To build on the box instead, see the comments in `deploy.sh`.
- **Backups are yours now.** `setup-server.sh` installs a nightly `pg_dump` cron
  to `/var/backups/bdp`. Copy those off-box periodically (or to HostKing storage).
- Optional CI deploy: `.github/workflows/deploy.yml` does the same as `deploy.sh`
  on push to the deploy branch (needs `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER` repo secrets).
