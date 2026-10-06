#!/usr/bin/env bash
# ===========================================================================
# Apply deploy/Caddyfile from GitHub to /etc/caddy/Caddyfile. Run as root
# from the Hetzner web console (no capitals or shifted symbols in these two
# lines, which the console can drop):
#
#   curl -f --location -o /root/caddy-apply.sh raw.githubusercontent.com/vrier/compose/main/deploy/apply-caddyfile.sh
#   bash /root/caddy-apply.sh
#
# It fetches the Caddyfile from the main branch, validates it, backs up the
# current one, installs it and reloads Caddy. If validation or the reload
# fails, the previous file is restored and Caddy keeps serving the old
# config. Finally it checks all four sites answer. Safe to run again.
# ===========================================================================
set -euo pipefail

RAW="https://raw.githubusercontent.com/Vrier/compose/main/deploy/Caddyfile"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
NEW="/root/Caddyfile.new"
SITES="www.tstephen.com slides.tstephen.com dace.tstephen.com compose.tstephen.com"

[ "$(id -u)" -eq 0 ] || { echo "Run this as root."; exit 1; }
command -v caddy >/dev/null || { echo "caddy is not installed."; exit 1; }

echo "== 1/4  Fetching deploy/Caddyfile from GitHub"
curl -fsSL -o "$NEW" "$RAW"
grep -q "^compose.tstephen.com" "$NEW" || { echo "   the fetched file doesn't look like our Caddyfile; stopping."; exit 1; }

echo "== 2/4  Validating"
if ! caddy validate --config "$NEW" --adapter caddyfile >/dev/null 2>&1; then
  caddy validate --config "$NEW" --adapter caddyfile || true
  echo "   validation FAILED; nothing changed."
  exit 1
fi
echo "   ok"

if cmp -s "$NEW" "$CADDYFILE"; then
  echo "== 3/4  $CADDYFILE already matches; nothing to install"
else
  BACKUP="$CADDYFILE.before-$(date +%Y%m%d-%H%M%S)"
  cp -a "$CADDYFILE" "$BACKUP"
  cp "$NEW" "$CADDYFILE"
  chmod 644 "$CADDYFILE"
  echo "== 3/4  Installed (previous file saved as $BACKUP)"
  if systemctl reload caddy; then
    echo "   Caddy reloaded"
  else
    cp -a "$BACKUP" "$CADDYFILE"
    echo "   reload FAILED: previous Caddyfile restored, Caddy still serving the old config"
    journalctl -u caddy -n 20 --no-pager || true
    exit 1
  fi
fi

echo "== 4/4  Checking the sites"
fail=0
for s in $SITES; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "https://$s/" || true)"
  echo "   $s -> $code"
  [ "$code" = "200" ] || fail=1
done
for s in www.tstephen.com slides.tstephen.com; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "https://$s/.git/HEAD" || true)"
  echo "   $s/.git/HEAD -> $code (want 404)"
  [ "$code" = "404" ] || fail=1
done
[ "$fail" = "0" ] && echo "== Done: all sites up, .git hidden." || { echo "== Done, but something above isn't right."; exit 1; }
