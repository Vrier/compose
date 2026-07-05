#!/usr/bin/env bash
# ===========================================================================
# COMPOSE — S4 scripted acceptance (W4), self-contained (see manual-s4.md for
# the in-browser journey these route-level checks approximate).
# ===========================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SERVER="$HERE/../server"
PORT=8095
B="http://127.0.0.1:$PORT"
DATA="$(mktemp -d)"
PASS=0; FAIL=0
say(){ printf '%s\n' "$*"; }
ok(){ PASS=$((PASS+1)); say "  PASS  $1"; }
bad(){ FAIL=$((FAIL+1)); say "  FAIL  $1"; }
check(){ case "$2" in *"$3"*) ok "$1";; *) bad "$1 — expected: $3"; say "        got: $(printf '%s' "$2" | head -c 160)";; esac }

[ -x "$SERVER/pocketbase" ] || { say "server/pocketbase missing — run server/get-pocketbase.sh"; exit 2; }
[ -f "$SERVER/template-edit.html" ] || { say "server/template-edit.html missing — run npm run build:server"; exit 2; }

( cd "$SERVER" && ./pocketbase serve --http "127.0.0.1:$PORT" --dir "$DATA" \
    --hooksDir ./pb_hooks --migrationsDir ./pb_migrations --publicDir ./pb_public >"$DATA/pb.log" 2>&1 ) &
PB_PID=$!
trap 'kill $PB_PID 2>/dev/null; rm -rf "$DATA"' EXIT
for i in $(seq 1 30); do curl -sf "$B/api/health" >/dev/null 2>&1 && break; sleep 0.3; done
curl -sf "$B/api/health" >/dev/null || { say "server did not come up"; tail -20 "$DATA/pb.log"; exit 2; }
say "server up on :$PORT"

J='Content-Type: application/json'
WS='{"compose":1,"title":"S4 Worksheet","domain":{"constants":{"e":"f"},"variables":{"e":"x y"}},"lexicon":[{"words":["Frodo"],"denotation":"f"},{"words":["runs"],"denotation":"Lx.run(x)"}],"exercises":[{"id":"g1","title":"A","items":[{"id":"d1","tree":"[.S [.DP Frodo ] [.VP runs ] ]","targets":["run(f)"]}]}]}'
BUNDLE=$(printf '{"compose_bundle":1,"title":"S4 Bundle","chapters":[],"worksheets":[{"key":"s4test","title":"S4 Worksheet","content":%s}]}' "$WS")

curl -s -X POST "$B/api/compose/register" -H "$J" -d '{"email":"carol@test.org","password":"carolpass123","inviteCode":"COMPOSE-INVITE-2026"}' >/dev/null
R=$(curl -s -X POST "$B/api/collections/users/auth-with-password" -H "$J" -d '{"identity":"carol@test.org","password":"carolpass123"}')
T=$(printf '%s' "$R" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
R=$(curl -s -X POST "$B/api/collections/versions/records" -H "$J" -H "Authorization: $T" -d "{\"title\":\"S4 Version\",\"bundle\":$BUNDLE}")
VID=$(printf '%s' "$R" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
SLUG=$(printf '%s' "$R" | sed -n 's/.*"slug":"\([a-z0-9]\{8\}\)".*/\1/p')
[ -n "$VID" ] && ok "version created ($VID, /v/$SLUG)" || { bad "creation failed: $R"; exit 1; }

say "— /edit/:id (instructor page)"
PAGE=$(curl -s "$B/edit/$VID")
check "instructor identity injected"        "$PAGE" 'hosted-teacher'
check "role is instructor"                  "$PAGE" '"role":"instructor"'
check "COMPOSE_HOSTED context injected"     "$PAGE" "\"versionId\":\"$VID\""
check "hosted keys list carries s4test"     "$PAGE" '"keys":["s4test"]'
check "PocketBase SDK vendored into page"   "$PAGE" 'PocketBase'
check "built-in library merged in (ch7.1)"  "$PAGE" 'ch7.1-adj'
check "version worksheet merged in"         "$PAGE" 's4test'
check "version worksheet gets ★ chapter"    "$PAGE" '"label":"★"'
R=$(curl -s -o /dev/null -w '%{http_code}' "$B/edit/nonexistent123")
[ "$R" = "404" ] && ok "unknown version id 404s" || bad "/edit/bad returned $R"

say "— /dash/"
R=$(curl -s "$B/dash/")
check "dashboard page serves" "$R" 'COMPOSE — Dashboard'
check "dashboard carries the SDK" "$R" 'PocketBase'

say "— editor Save-to-server upsert (API-equivalent)"
WS2=$(printf '%s' "$WS" | sed 's/S4 Worksheet/S4 Worksheet EDITED/g')
NEW_BUNDLE=$(printf '{"compose_bundle":1,"title":"S4 Bundle","chapters":[],"worksheets":[{"key":"s4test","title":"S4 Worksheet EDITED","content":%s}]}' "$WS2")
curl -s -X PATCH "$B/api/collections/versions/records/$VID" -H "$J" -H "Authorization: $T" -d "{\"bundle\":$NEW_BUNDLE}" >/dev/null
PAGE=$(curl -s "$B/v/$SLUG")
check "student URL reflects the upserted edit immediately" "$PAGE" 'S4 Worksheet EDITED'

say "— fork append (API-equivalent of ⑂)"
FORK_BUNDLE=$(printf '{"compose_bundle":1,"title":"S4 Bundle","chapters":[],"worksheets":[{"key":"s4test","title":"S4 Worksheet EDITED","content":%s},{"key":"ch7.1-adj-fork1234","title":"Adjectives (copy)","content":%s}]}' "$WS2" "$WS")
curl -s -X PATCH "$B/api/collections/versions/records/$VID" -H "$J" -H "Authorization: $T" -d "{\"bundle\":$FORK_BUNDLE}" >/dev/null
PAGE=$(curl -s "$B/edit/$VID")
check "forked worksheet appears in the edit page library" "$PAGE" 'ch7.1-adj-fork1234'
check "forked worksheet in hosted keys" "$PAGE" '"keys":["s4test","ch7.1-adj-fork1234"]'
PAGE=$(curl -s "$B/v/$SLUG")
check "forked worksheet serves to students" "$PAGE" 'Adjectives (copy)'

say ""
say "S4 acceptance: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
