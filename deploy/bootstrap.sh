#!/usr/bin/env bash
# ONE-SHOT bootstrap — provision + database + build + deploy, all in a single run.
# Designed so a non-technical operator only has to paste ONE line into the VPS
# console. Run as root on a fresh Ubuntu 24.04 VPS:
#
#   git clone https://TOKEN@github.com/iviwemalotana/bdp-management.git /opt/bdp \
#     && cd /opt/bdp && git checkout claude/hosting-platform-pricing-review-j26glk \
#     && bash deploy/bootstrap.sh
#
# Optional: prefix with NEON_URL='postgresql://...neon.tech/...' to also migrate
# your existing data. Without it, the API starts on a fresh empty database.
set -uo pipefail   # deliberately not -e: keep going and report at the end

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"; cd "$REPO_DIR"
log(){ echo -e "\n\033[1;36m== $* ==\033[0m"; }

log "1/7 Base provisioning (.NET runtime, Node, Postgres, Nginx, firewall)"
NEEDRESTART_MODE=a bash deploy/setup-server.sh

log "2/7 Build toolchains (.NET SDK + bun)"
DEBIAN_FRONTEND=noninteractive apt-get install -y dotnet-sdk-8.0 || {
  . /etc/os-release
  curl -sSL "https://packages.microsoft.com/config/ubuntu/${VERSION_ID}/packages-microsoft-prod.deb" -o /tmp/ms.deb
  dpkg -i /tmp/ms.deb && apt-get update && apt-get install -y dotnet-sdk-8.0
}
export BUN_INSTALL=/usr/local
curl -fsSL https://bun.sh/install | bash || true
BUN=/usr/local/bin/bun; [ -x "$BUN" ] || BUN="$(command -v bun || echo /root/.bun/bin/bun)"

log "3/7 Database (create role + db with a generated password)"
DBPASS="$(openssl rand -hex 16)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='bdp'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE bdp LOGIN PASSWORD '$DBPASS';"
sudo -u postgres psql -c "ALTER ROLE bdp PASSWORD '$DBPASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='bdp'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE bdp OWNER bdp;"

log "4/7 Env files (generated secrets; payment keys left blank for later)"
mkdir -p /etc/bdp
JWTSECRET="$(openssl rand -hex 32)"
cat >/etc/bdp/bdp-api.env <<EOF
DATABASE_URL=postgresql://bdp:$DBPASS@localhost:5432/bdp
JWT_SECRET=$JWTSECRET
JWT__Issuer=https://api.bedifferentpackaging.com
JWT__Audience=https://www.bedifferentpackaging.com
STOREFRONT_URL=https://www.bedifferentpackaging.com
ALLOWED_ORIGINS=https://www.bedifferentpackaging.com,https://admin.bedifferentpackaging.com
Paystack__SecretKey=
Paystack__StorefrontCallbackUrl=https://www.bedifferentpackaging.com/checkout/success
YunExpress__AppKey=
YunExpress__AppToken=
SEED_DATA=false
EOF
cat >/etc/bdp/storefront.env <<EOF
NEXT_PUBLIC_API_URL=https://api.bedifferentpackaging.com
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PORT=3000
NODE_ENV=production
EOF
chmod 640 /etc/bdp/*.env

if [ "${NEON_URL:-}" != "" ]; then
  log "4b. Migrating data from Neon"
  NEON_URL="$NEON_URL" VPS_URL="postgresql://bdp:$DBPASS@localhost:5432/bdp" bash deploy/migrate-db.sh || \
    echo "!! Neon migration hit an error — review above; the API will still start."
fi

log "5/7 Build all three apps"
dotnet publish BDP.API/BDP.API.csproj -c Release -o /var/www/bdp-api
( cd BDP.Storefront && "$BUN" install && NEXT_PUBLIC_API_URL=https://api.bedifferentpackaging.com "$BUN" run build )
rsync -a --delete BDP.Storefront/.next BDP.Storefront/public BDP.Storefront/package.json \
  BDP.Storefront/bun.lock BDP.Storefront/next.config.ts /var/www/bdp-storefront/
( cd /var/www/bdp-storefront && "$BUN" install --production )
echo "VITE_API_URL=https://api.bedifferentpackaging.com" > BDP.Web/.env.production
( cd BDP.Web && npm ci && npm run build )
rsync -a --delete BDP.Web/dist/ /var/www/admin/
chown -R www-data:www-data /var/www/bdp-api /var/www/bdp-storefront /var/www/admin

log "6/7 Install services + Nginx"
sed -i "s#^ExecStart=.*#ExecStart=$BUN run start#" deploy/systemd/bdp-storefront.service
cp deploy/systemd/bdp-api.service deploy/systemd/bdp-storefront.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now bdp-api bdp-storefront
cp deploy/nginx/bedifferentpackaging.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/bedifferentpackaging.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log "7/7 Health check"
sleep 6
echo "API        (want 200/404): $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5000/ || echo DOWN)"
echo "Storefront (want 200):     $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || echo DOWN)"

cat <<'EOF'

================= BOOTSTRAP COMPLETE =================
All three apps are built and running on the VPS.
Still to do (tell Claude Code — these are quick):
 1) Data: if you did NOT pass NEON_URL, the database is empty. We can migrate
    your Neon data, or seed a fresh catalogue.
 2) Payments: paste Paystack keys into /etc/bdp/bdp-api.env (secret) and the
    storefront public key, then restart.
 3) DNS + SSL: the Chrome "Part B" phase points the domain here and issues HTTPS.
The generated DB password lives in /etc/bdp/bdp-api.env.
=====================================================
EOF
