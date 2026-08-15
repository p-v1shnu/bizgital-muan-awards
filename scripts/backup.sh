#!/usr/bin/env bash
# Nightly backup: the database, and a manifest of what the images should be.
#
# Run from the directory holding docker-compose.yml, e.g. from cron:
#   0 3 * * *  cd /srv/muan && ./scripts/backup.sh >> /var/log/muan-backup.log 2>&1
set -euo pipefail

DEST="${BACKUP_DIR:-/srv/backups/muan}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
STAMP="$(date +%F-%H%M)"
mkdir -p "$DEST"

# --single-transaction keeps the dump consistent without locking the site out.
docker compose exec -T mysql \
  mysqldump --single-transaction --quick --default-character-set=utf8mb4 \
  -u root -p"${MYSQL_ROOT_PASSWORD:?set MYSQL_ROOT_PASSWORD}" muan_awards \
  | gzip > "$DEST/muan-$STAMP.sql.gz"

# A dump that cannot be read is not a backup: check before keeping it.
if ! gzip -t "$DEST/muan-$STAMP.sql.gz"; then
  echo "FAILED: $DEST/muan-$STAMP.sql.gz is not readable" >&2
  exit 1
fi
if ! zcat "$DEST/muan-$STAMP.sql.gz" | grep -q "CREATE TABLE \`editions\`"; then
  echo "FAILED: the dump has no editions table — check the database name" >&2
  exit 1
fi

find "$DEST" -name 'muan-*.sql.gz' -mtime "+$KEEP_DAYS" -delete
echo "$(date -Iseconds) ok $(du -h "$DEST/muan-$STAMP.sql.gz" | cut -f1) $DEST/muan-$STAMP.sql.gz"
