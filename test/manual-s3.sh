#!/usr/bin/env bash
# ===========================================================================
# COMPOSE — S3 acceptance checks (W2 + W3), self-contained.
# Boots the pinned PocketBase against a THROWAWAY data dir, drives the real
# HTTP API through registration gating, ownership isolation, serving-route
# injection, mode switching and the open counter, then tears down.
#
# Usage: bash test/manual-s3.sh     (requires server/pocketbase — run
#                                    server/get-pocketbase.sh first)
# ===========================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SERVER="$HERE/../server"
PORT=8091
B="http://127.0.0.1:$PORT"
DATA="$(mktemp -d)"
PASS=0; FAIL=0

say()  { printf '%s\n' "$*"; }
ok()   { PASS=$((PASS+1)); say "  PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); say "  FAIL  $1"; }
check(){ # check <desc> <haystack> <needle>
  case "$2" in *"$3"*) ok "$1";; *) bad "$1 — expected to contain: $3"; say "        got: $(printf '%s' "$2" | head -c 200)";; esac
}
check_not(){
  case "$2" in *"$3"*) bad "$1 — expected NOT to contain: $3";; *) ok "$1";; esac
}

[ -x "$SERVER/pocketbase" ] || { say "server/pocketbase missing — run server/get-pocketbase.sh"; exit 2; }
[ -f "$SERVER/template.html" ] || { say "server/template.html missing — run npm run build:server"; exit 2; }

"$SERVER/pocketbase" superuser upsert s3admin@compose.test S3adminPass123! --dir "$DATA" >/dev/null 2>&1
# Explicit dirs: PocketBase's relative-default resolution is unreliable when
# the executable lives behind a mount/symlink — always pass them (S3 finding).
( cd "$SERVER" && ./pocketbase serve --http "127.0.0.1:$PORT" --dir "$DATA" \
    --hooksDir ./pb_hooks --migrationsDir ./pb_migrations --publicDir ./pb_public >"$DATA/pb.log" 2>&1 ) &
PB_PID=$!
trap 'kill $PB_PID 2>/dev/null; rm -rf "$DATA"' EXIT

for i in $(seq 1 30); do curl -sf "$B/api/health" >/dev/null 2>&1 && break; sleep 0.3; done
curl -sf "$B/api/health" >/dev/null || { say "server did not come up; log:"; tail -20 "$DATA/pb.log"; exit 2; }
say "server up on :$PORT (data: throwaway)"

J='Content-Type: application/json'
WS='{"compose":1,"title":"S3 Test Worksheet","domain":{"constants":{"e":"f"},"variables":{"e":"x y"}},"lexicon":[{"words":["Frodo"],"denotation":"f"},{"words":["runs"],"denotation":"Lx.run(x)"}],"exercises":[{"id":"g1","title":"A. Test","items":[{"id":"d1","tree":"[.S [.DP Frodo ] [.VP runs ] ]","targets":["run(f)"]}]}]}'
BUNDLE=$(printf '{"compose_bundle":1,"title":"S3 Bundle","chapters":[],"worksheets":[{"key":"s3test","title":"S3 Test Worksheet","content":%s}]}' "$WS")

say "— registration gating"
R=$(curl -s -X POST "$B/api/compose/register" -H "$J" -d '{"email":"alice@test.org","password":"alicepass123"}')
check "register without code rejected" "$R" 'error'
R=$(curl -s -X POST "$B/api/compose/register" -H "$J" -d '{"email":"alice@test.org","password":"alicepass123","inviteCode":"WRONG"}')
check "register with bad code rejected" "$R" 'Invalid invite code'
R=$(curl -s -X POST "$B/api/compose/register" -H "$J" -d '{"email":"alice@test.org","password":"alicepass123","inviteCode":"COMPOSE-INVITE-2026"}')
check "register with good code succeeds" "$R" '"ok":true'
R=$(curl -s -X POST "$B/api/collections/users/records" -H "$J" -d '{"email":"mallory@test.org","password":"mallorypass1","passwordConfirm":"mallorypass1"}')
check_not "direct users API create is closed" "$R" '"email":"mallory@test.org"'

say "— login + version creation"
R=$(curl -s -X POST "$B/api/collections/users/auth-with-password" -H "$J" -d '{"identity":"alice@test.org","password":"alicepass123"}')
TA=$(printf '%s' "$R" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$TA" ] && ok "alice logs in" || bad "alice login failed: $R"
R=$(curl -s -X POST "$B/api/collections/versions/records" -H "$J" -H "Authorization: $TA" \
     -d "{\"title\":\"S3 Version\",\"bundle\":$BUNDLE,\"owner\":\"SPOOFED_OWNER_ID\",\"slug\":\"hackhack\"}")
SLUG=$(printf '%s' "$R" | sed -n 's/.*"slug":"\([a-z0-9]\{8\}\)".*/\1/p')
VID=$(printf '%s' "$R" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
[ -n "$SLUG" ] && [ "$SLUG" != "hackhack" ] && ok "slug is server-generated (client's 'hackhack' ignored: $SLUG)" || bad "slug generation: $R"
check_not "owner spoof ignored" "$R" 'SPOOFED_OWNER_ID'
check "mode defaults to practice" "$R" '"mode":"practice"'
check "published defaults to true" "$R" '"published":true'

say "— public serving"
PAGE=$(curl -s "$B/v/$SLUG")
check "page injects the worksheet library" "$PAGE" 'LC_FILES_INLINE'
check "page injects the actual worksheet content" "$PAGE" 's3test'
check "page injects isolated island"       "$PAGE" "\"island\":\"$SLUG\""
check "page injects practice mode"         "$PAGE" '"mode":"practice"'
check "page injects picker chapter for uncovered key" "$PAGE" 'COMPOSE_CHAPTERS_EXTRA'
check "page carries the version title"     "$PAGE" 'S3 Version'
curl -s "$B/v/$SLUG" >/dev/null   # second open
R=$(curl -s -X POST "$B/api/collections/_superusers/auth-with-password" -H "$J" -d '{"identity":"s3admin@compose.test","password":"S3adminPass123!"}')
TS=$(printf '%s' "$R" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
R=$(curl -s "$B/api/collections/versions/records/$VID" -H "Authorization: $TS")
check "open counter incremented twice" "$R" '"opens":2'
R=$(curl -s "$B/v/$SLUG/bundle.json")
check "bundle.json serves the raw companion" "$R" '"compose_bundle":1'
R=$(curl -s "$B/v/nosuchsl")
check "unknown slug gets the 404 page" "$R" '404'
R=$(curl -s "$B/")
check "root serves the hosted root instance" "$R" 'hosted-root'

say "— live edit + assessment mode"
curl -s -X PATCH "$B/api/collections/versions/records/$VID" -H "$J" -H "Authorization: $TA" -d '{"mode":"assessment","slug":"evilslug"}' >/dev/null
PAGE=$(curl -s "$B/v/$SLUG")
check "mode switch propagates to the served page" "$PAGE" '"mode":"assessment"'
check "slug PATCH ignored (URL still lives)"      "$PAGE" "\"island\":\"$SLUG\""

say "— ownership isolation"
curl -s -X POST "$B/api/compose/register" -H "$J" -d '{"email":"bob@test.org","password":"bobpassword12","inviteCode":"COMPOSE-INVITE-2026"}' >/dev/null
R=$(curl -s -X POST "$B/api/collections/users/auth-with-password" -H "$J" -d '{"identity":"bob@test.org","password":"bobpassword12"}')
TB=$(printf '%s' "$R" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
R=$(curl -s "$B/api/collections/versions/records" -H "Authorization: $TB")
check "bob's list does not contain alice's version" "$R" '"totalItems":0'
R=$(curl -s -X PATCH "$B/api/collections/versions/records/$VID" -H "$J" -H "Authorization: $TB" -d '{"title":"stolen"}')
check_not "bob cannot modify alice's version" "$R" '"title":"stolen"'
R=$(curl -s -X DELETE "$B/api/collections/versions/records/$VID" -H "Authorization: $TB" -o /dev/null -w '%{http_code}')
[ "$R" = "404" ] || [ "$R" = "403" ] && ok "bob cannot delete alice's version ($R)" || bad "bob delete returned $R"

say "— unpublish"
curl -s -X PATCH "$B/api/collections/versions/records/$VID" -H "$J" -H "Authorization: $TA" -d '{"published":false}' >/dev/null
R=$(curl -s -o /dev/null -w '%{http_code}' "$B/v/$SLUG")
[ "$R" = "404" ] && ok "unpublished version 404s" || bad "unpublished version served ($R)"

say ""
say "S3 acceptance: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
