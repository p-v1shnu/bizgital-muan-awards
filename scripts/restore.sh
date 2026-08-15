#!/usr/bin/env bash
# Restore a dump into a database. Refuses to touch the live one unless told
# twice, because the usual reason to run this is a drill, not a disaster.
#
#   ./scripts/restore.sh /srv/backups/muan/muan-2026-08-14-0300.sql.gz muan_restore_test
set -euo pipefail

DUMP="${1:?usage: restore.sh <dump.sql.gz> [database]}"
TARGET="${2:-muan_restore_test}"

if [ "$TARGET" = "muan_awards" ] && [ "${I_MEAN_IT:-}" != "yes" ]; then
  echo "Refusing to overwrite the live database. Re-run with I_MEAN_IT=yes to proceed." >&2
  exit 1
fi

docker compose exec -T mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD:?}" \
  -e "DROP DATABASE IF EXISTS \`$TARGET\`; CREATE DATABASE \`$TARGET\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
zcat "$DUMP" | docker compose exec -T mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD:?}" "$TARGET"

echo "— what came back —"
docker compose exec -T mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD:?}" "$TARGET" -e "
SELECT 'editions' AS what, COUNT(*) AS rows_ FROM editions
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'nominations', COUNT(*) FROM nominations
UNION ALL SELECT 'winners', COUNT(*) FROM nominations WHERE isWinner = 1
UNION ALL SELECT 'creators', COUNT(*) FROM creators
UNION ALL SELECT 'submissions', COUNT(*) FROM public_submissions
UNION ALL SELECT 'admin_users', COUNT(*) FROM admin_users;"
