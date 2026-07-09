#!/usr/bin/env bash
# ===========================================================================
# COMPOSE — server-side deploy (S7/W8): pull → build → restart.
# Run as the `compose` user (GitHub Actions SSHes in and runs exactly this;
# it can also be run by hand after a manual push).
#
#   bash /srv/compose/deploy/deploy.sh
#
# Safe by construction: tests already gated the push in CI; PocketBase data
# lives in /srv/compose-data, untouched by anything here.
# ===========================================================================
set -euo pipefail

REPO=/srv/compose
cd "$REPO"

echo "== fetch"
git fetch origin main
git reset --hard origin/main

echo "== install deps (dev toolchain: esbuild, react, sdk, qrcode)"
npm ci --no-audit --no-fund

echo "== ensure pinned PocketBase binary"
if [ ! -x server/pocketbase ]; then
  bash server/get-pocketbase.sh
else
  # re-fetch only if the pin changed
  WANT=$(grep -oP 'PB_VERSION="\K[0-9.]+' server/get-pocketbase.sh)
  HAVE=$(server/pocketbase --version 2>/dev/null | grep -oP '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo none)
  if [ "$WANT" != "$HAVE" ]; then
    echo "   pin changed ($HAVE → $WANT) — fetching"
    bash server/get-pocketbase.sh
  fi
fi

echo "== build server artifacts (templates, root instance, dash, vendored engine)"
node build/server.mjs

echo "== restart"
sudo /usr/bin/systemctl restart compose
sleep 2
sudo /usr/bin/systemctl is-active compose >/dev/null && echo "== live: $(curl -fsS http://127.0.0.1:8090/api/health || echo 'HEALTH CHECK FAILED')"
