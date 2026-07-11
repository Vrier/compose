#!/usr/bin/env bash
# ===========================================================================
# COMPOSE — restore drill (S16): prove the newest PocketBase backup zip
# actually restores into a working instance. Non-destructive: restores into
# /tmp and boots a throwaway PB on 127.0.0.1:8190; the live service and
# /srv/compose-data are never touched.
#
#   bash /srv/compose/deploy/restore-drill.sh
#
# Run it once before announcing the service, then after any PocketBase
# upgrade. Record the date in DEPLOY.md §10 when it passes.
# ===========================================================================
set -euo pipefail

BACKUPS=/srv/compose-data/backups
PB=/srv/compose/server/pocketbase
PORT=8190
WORK=$(mktemp -d /tmp/compose-restore-drill.XXXXXX)

fail() { echo "✗ RESTORE DRILL FAILED: $*" >&2; exit 1; }
cleanup() {
  [ -n "${PB_PID:-}" ] && kill "$PB_PID" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

[ -x "$PB" ] || fail "PocketBase binary not found at $PB"
NEWEST=$(ls -1t "$BACKUPS"/*.zip 2>/dev/null | head -1) || true
[ -n "${NEWEST:-}" ] || fail "no backup zips in $BACKUPS (create one: PB admin → Settings → Backups)"
echo "== newest backup: $NEWEST ($(du -h "$NEWEST" | cut -f1), $(date -r "$NEWEST" '+%Y-%m-%d %H:%M'))"

echo "== restoring into $WORK"
unzip -qo "$NEWEST" -d "$WORK/pb_data"
[ -s "$WORK/pb_data/data.db" ] || fail "restored zip has no data.db"

echo "== booting throwaway instance on 127.0.0.1:$PORT"
"$PB" serve --http "127.0.0.1:$PORT" --dir "$WORK/pb_data" \
  --hooksDir /srv/compose/server/pb_hooks \
  --migrationsDir /srv/compose/server/pb_migrations \
  --publicDir /srv/compose/server/pb_public >"$WORK/pb.log" 2>&1 &
PB_PID=$!

ok=""
for i in $(seq 1 20); do
  sleep 0.5
  if curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then ok=1; break; fi
done
[ -n "$ok" ] || { tail -5 "$WORK/pb.log" >&2; fail "restored instance never became healthy"; }

# The restored DB must actually be readable: a protected endpoint should
# answer 401 (auth wall reached ⇒ collections loaded), not 404/500.
CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/collections/versions/records")
case "$CODE" in
  200|401|403) : ;;
  *) fail "versions collection not served from restored data (HTTP $CODE)" ;;
esac

echo "✓ RESTORE DRILL OK — backup restores to a healthy instance (versions endpoint: HTTP $CODE)"
echo "  → record today's date in DEPLOY.md §10"
