#!/usr/bin/env bash
# ===========================================================================
# COMPOSE — nightly off-box backup copy (S7/W8).
# PocketBase's own scheduled backups (migration 1751700003) write zips into
# /srv/compose-data/backups nightly. This script copies the NEWEST one
# off-box. Cron (as compose):  17 4 * * *  bash /srv/compose/deploy/backup.sh
#
# Configure the target once in /srv/compose-data/backup-target — one line,
# an scp/rsync destination, e.g. for a Hetzner Storage Box:
#   u123456@u123456.your-storagebox.de:compose-backups/
# If the file is missing, this script says so and exits 0 (deliberate:
# don't fail the cron before the target exists — but set it up!).
# ===========================================================================
set -euo pipefail

BACKUPS=/srv/compose-data/backups
TARGET_FILE=/srv/compose-data/backup-target

[ -f "$TARGET_FILE" ] || { echo "backup.sh: no $TARGET_FILE configured — OFF-BOX COPY NOT RUNNING"; exit 0; }
TARGET=$(head -1 "$TARGET_FILE")

NEWEST=$(ls -1t "$BACKUPS"/*.zip 2>/dev/null | head -1 || true)
[ -n "$NEWEST" ] || { echo "backup.sh: no backups found in $BACKUPS yet"; exit 0; }

# -p port 23 is the Storage Box ssh port; harmless for normal ssh targets that
# override it in ~/.ssh/config. Adjust if your target differs.
scp -P 23 -o StrictHostKeyChecking=accept-new "$NEWEST" "$TARGET"
echo "backup.sh: copied $(basename "$NEWEST") → $TARGET"
