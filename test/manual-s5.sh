#!/usr/bin/env bash
# ===========================================================================
# COMPOSE — S5 acceptance (W5 + W6): validation, limits, rate limits, QR.
# Self-contained: boots the pinned PocketBase against a throwaway data dir.
# Requires: server/get-pocketbase.sh done, npm run build:server done (the
# validation hook needs server/pb_hooks/vendor/{engine,lcformat}.js).
# ===========================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SERVER="$HERE/../server"
PORT=8097
B="http://127.0.0.1:$PORT"
DATA="$(mktemp -d)"
PAY="$(mktemp -d)"
PASS=0; FAIL=0
say(){ printf '%s\n' "$*"; }
ok(){ PASS=$((PASS+1)); say "  PASS  $1"; }
bad(){ FAIL=$((FAIL+1)); say "  FAIL  $1"; }
check(){ case "$2" in *"$3"*) ok "$1";; *) bad "$1 — expected: $3"; say "        got: $(printf '%s' "$2" | head -c 220)";; esac }
check_not(){ case "$2" in *"$3"*) bad "$1 — expected NOT: $3";; *) ok "$1";; esac }

[ -x "$SERVER/pocketbase" ] || { say "server/pocketbase missing"; exit 2; }
[ -f "$SERVER/pb_hooks/vendor/lcformat.js" ] || { say "vendor engine missing — run npm run build:server"; exit 2; }

( cd "$SERVER" && ./pocketbase serve --http "127.0.0.1:$PORT" --dir "$DATA" \
    --hooksDir ./pb_hooks --migrationsDir ./pb_migrations --publicDir ./pb_public >"$DATA/pb.log" 2>&1 ) &
PB_PID=$!
trap 'kill $PB_PID 2>/dev/null; rm -rf "$DATA" "$PAY"' EXIT
for i in $(seq 1 30); do curl -sf "$B/api/health" >/dev/null 2>&1 && break; sleep 0.3; done
curl -sf "$B/api/health" >/dev/null || { say "server did not come up"; tail -20 "$DATA/pb.log"; exit 2; }
say "server up on :$PORT"

J='Content-Type: application/json'

# Payload files (the big ones are generated)
node -e '
const fs = require("fs");
const ws = (title) => ({ compose: 1, title, domain: { constants: { e: "f" } }, lexicon: [{ words: ["runs"], denotation: "Lx.run(x)" }], exercises: [{ id: "g1", items: [{ id: "d1", tree: "[.S runs ]", targets: ["run(f)"] }] }] });
const wrap = (worksheets) => ({ title: "T", bundle: { compose_bundle: 1, title: "B", chapters: [], worksheets } });
// valid
fs.writeFileSync(process.argv[1] + "/valid.json", JSON.stringify(wrap([{ key: "w1", title: "W1", content: ws("W1") }])));
// semantic garbage: broken denotation + broken target + bad version worksheet
const bad = { compose: 1, title: "Bad", lexicon: [{ words: ["runs"], denotation: "Lx.run(x" }], exercises: [{ items: [{ tree: "[.S runs ]", targets: ["run(f"] }] }] };
fs.writeFileSync(process.argv[1] + "/garbage.json", JSON.stringify(wrap([{ key: "bad1", title: "Bad", content: bad }])));
// duplicate keys
fs.writeFileSync(process.argv[1] + "/dupkeys.json", JSON.stringify(wrap([{ key: "w1", content: ws("A") }, { key: "w1", content: ws("B") }])));
// 41 worksheets
fs.writeFileSync(process.argv[1] + "/toomany.json", JSON.stringify(wrap(Array.from({ length: 41 }, (_, i) => ({ key: "w" + i, content: ws("W" + i) })))));
// 401 derivations across 5 worksheets
const bigWs = (title) => ({ compose: 1, title, domain: { constants: { e: "f" } }, lexicon: [{ words: ["runs"], denotation: "Lx.run(x)" }], exercises: [{ id: "g1", items: Array.from({ length: 81 }, (_, i) => ({ id: "d" + i, tree: "[.S runs ]" })) }] });
fs.writeFileSync(process.argv[1] + "/toodeep.json", JSON.stringify(wrap(Array.from({ length: 5 }, (_, i) => ({ key: "big" + i, content: bigWs("Big" + i) })))));
// > 2 MB
const fat = ws("Fat"); fat.subtitle = "x".repeat(2 * 1024 * 1024 + 1000);
fs.writeFileSync(process.argv[1] + "/oversize.json", JSON.stringify(wrap([{ key: "fat", content: fat }])));
' "$PAY"

curl -s -X POST "$B/api/compose/register" -H "$J" -d '{"email":"dora@test.org","password":"dorapassword1","inviteCode":"COMPOSE-INVITE-2026"}' >/dev/null
R=$(curl -s -X POST "$B/api/collections/users/auth-with-password" -H "$J" -d '{"identity":"dora@test.org","password":"dorapassword1"}')
T=$(printf '%s' "$R" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$T" ] && ok "login" || { bad "login: $R"; exit 1; }

say "— validation on create/update (goja: full semantic pass)"
R=$(curl -s -X POST "$B/api/collections/versions/records" -H "$J" -H "Authorization: $T" -d @"$PAY/valid.json")
VID=$(printf '%s' "$R" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
SLUG=$(printf '%s' "$R" | sed -n 's/.*"slug":"\([a-z0-9]\{8\}\)".*/\1/p')
[ -n "$VID" ] && ok "valid bundle accepted" || bad "valid bundle rejected: $(printf '%s' "$R" | head -c 200)"
R=$(curl -s -X POST "$B/api/collections/versions/records" -H "$J" -H "Authorization: $T" -d @"$PAY/garbage.json")
check "broken denotation rejected, path named"  "$R" 'lexicon[0].denotation'
check "broken target rejected, path named"      "$R" 'targets[0]'
check "diagnostics array in error payload"      "$R" '"diagnostics"'
R=$(curl -s -X POST "$B/api/collections/versions/records" -H "$J" -H "Authorization: $T" -d @"$PAY/dupkeys.json")
check "duplicate worksheet keys rejected"       "$R" 'duplicate key'
R=$(curl -s -X POST "$B/api/collections/versions/records" -H "$J" -H "Authorization: $T" -d @"$PAY/toomany.json")
check "41 worksheets rejected"                  "$R" 'limit is 40'
R=$(curl -s -X POST "$B/api/collections/versions/records" -H "$J" -H "Authorization: $T" -d @"$PAY/toodeep.json")
check "405 derivations rejected"                "$R" 'limit is 400'
R=$(curl -s -X POST "$B/api/collections/versions/records" -H "$J" -H "Authorization: $T" -d @"$PAY/oversize.json")
check "oversize bundle rejected"                "$R" 'limit is 2 MB'
R=$(curl -s -X PATCH "$B/api/collections/versions/records/$VID" -H "$J" -H "Authorization: $T" -d "{\"bundle\":$(sed 's/.*"bundle"://; s/}$//' "$PAY/garbage.json")}")
check "update path validates too"               "$R" 'lexicon[0].denotation'
PAGE=$(curl -s "$B/v/$SLUG")
check "valid content still round-trips to students" "$PAGE" '"island":"'$SLUG'"'

say "— dash page carries the QR library"
R=$(curl -s "$B/dash/")
check "QRCode bundled into dash" "$R" 'QRCode'

say "— rate limiting (5/min on register)"
CODES=""
for i in 1 2 3 4 5 6 7; do
  C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/compose/register" -H "$J" -d '{"email":"rl'$i'@test.org","password":"x","inviteCode":"nope"}')
  CODES="$CODES $C"
done
case "$CODES" in *429*) ok "rapid registers hit 429 ($CODES)";; *) bad "no 429 seen: $CODES";; esac

say ""
say "S5 acceptance: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
