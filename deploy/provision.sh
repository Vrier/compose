#!/usr/bin/env bash
# ===========================================================================
# COMPOSE — one-shot server provision (S7/W8). Runs DEPLOY.md §2–§6 and the
# server side of §9 unattended. Idempotent: safe to re-run after a failure.
#
# On the VPS, as root:
#   curl -fsSL https://raw.githubusercontent.com/Vrier/compose/main/deploy/provision.sh | bash
#
# It ends by printing exactly what remains for a human (admin password,
# GitHub secret, off-box backup target).
# ===========================================================================
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

REPO_URL=https://github.com/Vrier/compose.git
step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }

step "1/8 System packages"
apt-get update -q
apt-get -yq upgrade
apt-get -yq install git ufw unzip curl ca-certificates gnupg

step "2/8 Firewall (22/80/443)"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ufw status | head -6

step "3/8 Node 22 + Caddy"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v22" ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get -yq install nodejs
fi
node -v
if ! command -v caddy >/dev/null; then
  apt-get -yq install debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q && apt-get -yq install caddy
fi
caddy version | head -1

step "4/8 compose user + directories"
id compose >/dev/null 2>&1 || adduser --system --group --home /srv/compose --shell /bin/bash compose
mkdir -p /srv/compose-data /srv/site /srv/compose/.ssh
[ -f /srv/site/index.html ] || printf '<!DOCTYPE html><title>tstephen.com</title><p>Coming soon.</p>\n' > /srv/site/index.html
chown -R compose:compose /srv/compose /srv/compose-data
chmod 700 /srv/compose/.ssh

step "5/8 Clone/update the repo + first build"
if [ ! -d /srv/compose/.git ]; then
  sudo -Hu compose git -C /srv/compose init -q
  sudo -Hu compose git -C /srv/compose remote add origin "$REPO_URL"
fi
sudo -Hu compose git -C /srv/compose fetch -q origin main
sudo -Hu compose git -C /srv/compose checkout -q -f -B main origin/main
cd /srv/compose
sudo -Hu compose npm ci --no-audit --no-fund
[ -x server/pocketbase ] || sudo -Hu compose bash server/get-pocketbase.sh
sudo -Hu compose node build/server.mjs

step "6/8 systemd unit + sudoers + Caddy"
cp deploy/compose.service /etc/systemd/system/compose.service
cp deploy/compose-sudoers /etc/sudoers.d/compose
chmod 0440 /etc/sudoers.d/compose
systemctl daemon-reload
systemctl enable --now compose
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl enable caddy >/dev/null 2>&1 || true
systemctl restart caddy
sleep 2
systemctl is-active compose >/dev/null && echo "compose service: active"
systemctl is-active caddy >/dev/null && echo "caddy service:   active"

step "7/8 GitHub Actions deploy key (server side of DEPLOY.md §9)"
if [ ! -f /root/actions_deploy_key ]; then
  ssh-keygen -t ed25519 -N '' -C 'github-actions-deploy' -f /root/actions_deploy_key -q
  cat /root/actions_deploy_key.pub >> /srv/compose/.ssh/authorized_keys
  chown compose:compose /srv/compose/.ssh/authorized_keys
  chmod 600 /srv/compose/.ssh/authorized_keys
fi

step "8/8 Smoke tests"
sleep 1
echo "local health:  $(curl -fsS http://127.0.0.1:8090/api/health || echo FAILED)"
echo "public health: $(curl -fsS --max-time 30 https://compose.tstephen.com/api/health || echo 'not yet — TLS cert may take ~1 min on first request; retry: curl https://compose.tstephen.com/api/health')"

cat <<'DONE'

===========================================================================
 PROVISION COMPLETE. Three things remain, all human-only:

 1. ADMIN ACCOUNT — run (with a password you choose):
      sudo -u compose /srv/compose/server/pocketbase superuser upsert \
        tom.stephen64@gmail.com 'YOUR-STRONG-PASSWORD' --dir /srv/compose-data
    then log in at https://compose.tstephen.com/_/ and CHANGE THE INVITE
    CODE (collection invite_codes, row COMPOSE-INVITE-2026).

 2. GITHUB SECRET — copy the private key printed below into:
    github.com/Vrier/compose → Settings → Secrets and variables → Actions
    → New repository secret → name: DEPLOY_SSH_KEY
    Afterwards delete it from the server:  rm /root/actions_deploy_key*

 3. OFF-BOX BACKUPS — within the week: DEPLOY.md §8 (Hetzner Storage Box).

DONE
echo "----- DEPLOY_SSH_KEY secret value (copy everything between the lines) -----"
cat /root/actions_deploy_key
echo "----------------------------------------------------------------------------"
