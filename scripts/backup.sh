#!/usr/bin/env bash
# Nightly backup: the database, and a manifest of what the images should be.
#
# Run from the directory holding docker-compose.yml, e.g. from cron:
#   0 3 * * *  cd /srv/muan && ./scripts/backup.sh >> /var/log/muan-backup.log 2>&1
#
# Set BACKUP_HEARTBEAT_URL and the last line tells a monitoring service the
# backup finished. Nothing is sent when it fails, which is the point: a script
# that shouts on failure stays silent when cron never ran it at all, when the
# server is off, and when the shouting itself is what broke. Silence is the
# alarm, so the service raises one if a night goes by without a word.
# Left unset, the script behaves exactly as it did before.
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
# `set -o pipefail` and `grep -q` are a trap together: grep stops reading at the
# first match and closes the pipe, zcat is still writing, and the SIGPIPE that
# kills it becomes exit 141 for the whole pipeline — so a check that *passed*
# reads as a failed backup. It only bites once the dump is large enough that
# zcat has not already finished, which is to say on every real one: reproduced
# 5 times out of 5 on a 900 KB file, and the drill dump was 868 KB. Left alone,
# this would have reported a failed backup every night while backing up
# perfectly. pipefail is off for this line only.
if ! ( set +o pipefail; zcat "$DEST/muan-$STAMP.sql.gz" | grep -q "CREATE TABLE \`editions\`" ); then
  echo "FAILED: the dump has no editions table — check the database name" >&2
  exit 1
fi

# A dump of the right shape can still be a dump of almost nothing, and the two
# checks above would both pass on it. There is no fixed size that separates the
# two: measured on this schema, an empty database gzips to 2.3 KB and a real
# day-one site — one year, six categories, the site settings — to 4.0 KB, so any
# constant sits either above a legitimate first backup or below a broken later
# one. Last night's file is the honest yardstick instead.
SIZE="$(stat -c %s "$DEST/muan-$STAMP.sql.gz")"
# Sorted whole and trimmed afterwards rather than piped through `head -1`, for
# the same SIGPIPE reason as above.
NEWEST_FIRST="$(find "$DEST" -name 'muan-*.sql.gz' ! -name "muan-$STAMP.sql.gz" -printf '%T@ %p\n' | sort -rn)"
PREVIOUS="${NEWEST_FIRST%%$'\n'*}"
PREVIOUS="${PREVIOUS#* }"
if [ -n "$PREVIOUS" ]; then
  PREVIOUS_SIZE="$(stat -c %s "$PREVIOUS")"
  if [ "$SIZE" -lt $((PREVIOUS_SIZE / 2)) ]; then
    # The file is kept, not deleted: if this is real data loss the dump is
    # evidence, and if it is expected it becomes tomorrow's yardstick, so the
    # next run passes on its own.
    echo "FAILED: $SIZE bytes against $PREVIOUS_SIZE the run before — the database lost more than half its content" >&2
    echo "        Expected if someone just purged the submission queue; otherwise check the site before trusting this file." >&2
    exit 1
  fi
fi

find "$DEST" -name 'muan-*.sql.gz' -mtime "+$KEEP_DAYS" -delete
echo "$(date -Iseconds) ok $(du -h "$DEST/muan-$STAMP.sql.gz" | cut -f1) $DEST/muan-$STAMP.sql.gz"

# Last, and only on the way out through the front door. A failure anywhere
# above has already exited, so this line is unreachable unless the backup is
# on disk and readable. `|| echo` because a monitoring service that is briefly
# unreachable is not a failed backup, and must not be reported as one.
if [ -n "${BACKUP_HEARTBEAT_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 --retry-delay 5 -o /dev/null "$BACKUP_HEARTBEAT_URL" \
    || echo "$(date -Iseconds) warning: backup succeeded but the heartbeat could not be sent" >&2
fi
