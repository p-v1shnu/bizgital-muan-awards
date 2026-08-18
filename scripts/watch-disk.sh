#!/usr/bin/env bash
# Says the disk is fine — and says nothing at all when it is not.
#
# Run from cron on the host, next to the backup:
#   */30 * * * *  cd /srv/muan && DISK_HEARTBEAT_URL='https://uptime.betterstack.com/api/v1/heartbeat/xxxx' \
#                 ./scripts/watch-disk.sh >> /var/log/muan-disk.log 2>&1
#
# A full disk is the most common way a small server goes down quietly:
# MySQL will not start, Docker cannot write a layer, and nothing about the site
# says why. It is also the one failure an uptime check cannot see coming — the
# site is up right until it is not.
#
# Silence is the alarm, the same design as backup.sh and for the same reason: a
# script that shouts on failure stays silent when cron never ran it, when the
# server is off, and when the shouting itself is what broke. So this pings a
# heartbeat only while every watched path is under the limit, and the monitoring
# service raises the alarm when the ping stops.
set -euo pipefail

# Percent used at which this stops reporting healthy. 85 leaves room to notice
# and act: a nightly dump plus the container logs can add a few percent a week,
# and MySQL needs free space to start at all, not merely to run.
LIMIT="${DISK_WARN_PERCENT:-85}"

# The filesystem holding the containers and the database by default, plus the
# backups if they live somewhere else — they are the part nothing caps in size
# (monitoring.md §5).
BACKUPS="${BACKUP_DIR:-/srv/backups/muan}"
PATHS="${DISK_WATCH_PATHS:-/}"
if [ -d "$BACKUPS" ]; then PATHS="$PATHS $BACKUPS"; fi

# -P for the portable one-line-per-filesystem format: without it a long device
# name wraps onto its own line and the awk below reads the wrong column.
used_percent() {
  df -P "$1" | awk 'NR == 2 { gsub("%", "", $5); print $5 }'
}

FAILED=0
SEEN=""
for target in $PATHS; do
  if [ ! -e "$target" ]; then
    echo "$(date -Iseconds) warning: $target does not exist — skipped" >&2
    continue
  fi

  # Two watched paths on one filesystem would otherwise be reported twice, which
  # reads like two problems.
  device="$(df -P "$target" | awk 'NR == 2 { print $1 }')"
  case " $SEEN " in *" $device "*) continue ;; esac
  SEEN="$SEEN $device"

  percent="$(used_percent "$target")"
  if [ -z "$percent" ]; then
    echo "$(date -Iseconds) FAILED: could not read disk usage for $target" >&2
    FAILED=1
    continue
  fi

  if [ "$percent" -ge "$LIMIT" ]; then
    echo "$(date -Iseconds) FAILED: $target is ${percent}% full (limit ${LIMIT}%)" >&2
    # What is worth looking at first, printed here so the log line is enough to
    # act on without a second visit to the server.
    du -xh --max-depth=1 "$target" 2>/dev/null | sort -rh | head -6 >&2 || true
    FAILED=1
  else
    echo "$(date -Iseconds) ok ${percent}% used on $target (limit ${LIMIT}%)"
  fi
done

if [ "$FAILED" -ne 0 ]; then
  # No heartbeat: the alarm is the silence that follows.
  exit 1
fi

# Only on the way out through the front door, and only if a URL was given —
# without one the script still works, it is just nobody's business but the log's.
# `|| echo` because a monitoring service that is briefly unreachable is not a
# full disk, and must not be reported as one.
if [ -n "${DISK_HEARTBEAT_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 --retry-delay 5 -o /dev/null "$DISK_HEARTBEAT_URL" \
    || echo "$(date -Iseconds) warning: disk is fine but the heartbeat could not be sent" >&2
fi
