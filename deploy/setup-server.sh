#!/usr/bin/env bash
# BDP VPS provisioning — run as root on a fresh Ubuntu 22.04/24.04 LTS HostKing VPS.
#   scp -r deploy root@<VPS_IP>:/root/ && ssh root@<VPS_IP> 'bash /root/deploy/setup-server.sh'
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"      # non-root sudo user that owns deploys
DB_NAME="${DB_NAME:-bdp}"
DB_USER="${DB_USER:-bdp}"

echo "== 1. Base packages & updates =="
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get -y upgrade
apt-get install -y curl gnupg ca-certificates ufw fail2ban unattended-upgrades rsync git

echo "== 2. Non-root sudo user '$DEPLOY_USER' =="
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  echo "  >> Add your SSH public key to /home/$DEPLOY_USER/.ssh/authorized_keys"
fi

echo "== 3. Firewall (SSH + HTTP + HTTPS only) =="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "== 4. Automatic security updates =="
dpkg-reconfigure -f noninteractive unattended-upgrades || true

echo "== 5. .NET 8 ASP.NET Core runtime =="
# Ubuntu 24.04 ships dotnet in the default feed; 22.04 needs the MS feed.
if ! apt-get install -y aspnetcore-runtime-8.0; then
  source /etc/os-release
  curl -sSL "https://packages.microsoft.com/config/ubuntu/${VERSION_ID}/packages-microsoft-prod.deb" -o /tmp/ms.deb
  dpkg -i /tmp/ms.deb && apt-get update
  apt-get install -y aspnetcore-runtime-8.0
fi

echo "== 6. Node 20 LTS + bun (for the Next.js storefront) =="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
# bun installed for the deploy user (storefront standardises on bun)
sudo -u "$DEPLOY_USER" bash -c 'curl -fsSL https://bun.sh/install | bash' || true

echo "== 7. PostgreSQL =="
apt-get install -y postgresql postgresql-contrib

echo "== 8. Nginx + Certbot =="
apt-get install -y nginx certbot python3-certbot-nginx

echo "== 9. App directories =="
install -d -o "$DEPLOY_USER" -g www-data /var/www/bdp-api
install -d -o "$DEPLOY_USER" -g www-data /var/www/bdp-api/wwwroot/uploads/artwork
install -d -o "$DEPLOY_USER" -g www-data /var/www/bdp-api/wwwroot/invoices
install -d -o "$DEPLOY_USER" -g www-data /var/www/bdp-storefront
install -d -o "$DEPLOY_USER" -g www-data /var/www/admin
install -d -m 750 -o root -g "$DEPLOY_USER" /etc/bdp          # env files (secrets)
install -d -m 750 -o postgres -g postgres /var/backups/bdp

echo "== 10. Nightly DB backup cron =="
cat >/etc/cron.d/bdp-pg-backup <<EOF
30 2 * * * postgres pg_dump -Fc $DB_NAME > /var/backups/bdp/${DB_NAME}-\$(date +\%F).dump && find /var/backups/bdp -name '*.dump' -mtime +14 -delete
EOF

cat <<EOF

== DONE. Manual next steps ==
1) Add your SSH public key to /home/$DEPLOY_USER/.ssh/authorized_keys, then
   harden SSH: set 'PasswordAuthentication no' in /etc/ssh/sshd_config && systemctl restart ssh
2) Create the database + role:
     sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD 'CHANGE_ME';"
     sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
3) Fill /etc/bdp/bdp-api.env and /etc/bdp/storefront.env from deploy/env/*.example
4) Migrate data:    bash deploy/migrate-db.sh
5) Install services + nginx site, then deploy:  (see deploy/README.md)
6) After DNS points here, issue SSL:
     certbot --nginx -d bedifferentpackaging.com -d www.bedifferentpackaging.com \\
       -d api.bedifferentpackaging.com -d admin.bedifferentpackaging.com
EOF
