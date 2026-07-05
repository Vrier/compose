#!/usr/bin/env bash
# ===========================================================================
# COMPOSE — fetch the PINNED PocketBase release into server/.
#
# The version is pinned on purpose (PLAN.md §3): PocketBase is pre-1.0 and
# minor versions can break compatibility. Update ONLY between teaching terms,
# after reading the changelog, then update PB_VERSION here and re-run.
# ===========================================================================
set -euo pipefail

PB_VERSION="0.39.5"   # ← the pin. Recorded in PLAN.md §8 (S3).

cd "$(dirname "$0")"

case "$(uname -s)_$(uname -m)" in
  Linux_x86_64)   PLAT="linux_amd64" ;;
  Darwin_arm64)   PLAT="darwin_arm64" ;;
  Darwin_x86_64)  PLAT="darwin_amd64" ;;
  *) echo "Unsupported platform: $(uname -s) $(uname -m) — download manually from" \
        "https://github.com/pocketbase/pocketbase/releases/tag/v${PB_VERSION}" >&2; exit 1 ;;
esac

ZIP="pocketbase_${PB_VERSION}_${PLAT}.zip"
URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${ZIP}"

echo "Fetching PocketBase v${PB_VERSION} (${PLAT}) …"
curl -fsSL -o "${ZIP}" "${URL}"
unzip -o -q "${ZIP}" pocketbase
rm -f "${ZIP}"
chmod +x pocketbase
./pocketbase --version
echo "OK — server/pocketbase ready. Dev run:"
echo "  cd server && ./pocketbase serve --hooksDir ./pb_hooks --migrationsDir ./pb_migrations --publicDir ./pb_public"
