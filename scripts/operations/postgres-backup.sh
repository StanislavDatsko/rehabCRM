#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_ENCRYPTION_RECIPIENT:?BACKUP_ENCRYPTION_RECIPIENT is required}"
: "${BACKUP_OUTPUT_PATH:?BACKUP_OUTPUT_PATH is required}"

case "$BACKUP_OUTPUT_PATH" in
  /*.age) ;;
  *) echo "BACKUP_OUTPUT_PATH must be an absolute .age file" >&2; exit 2 ;;
esac

umask 077
database_url=$(printf '%s' "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//')
dump_file=$(mktemp "${TMPDIR:-/tmp}/rehabcrm-postgres-backup.XXXXXX")
trap 'rm -f "$dump_file"' EXIT HUP INT TERM

if [ "${PG_CLIENT_MODE:-auto}" = "docker" ] || { [ "${PG_CLIENT_MODE:-auto}" = "auto" ] && command -v docker >/dev/null 2>&1; }; then
  compose_file="${COMPOSE_FILE:-infra/docker/docker-compose.yml}"
  docker compose -f "$compose_file" exec -T postgres pg_dump --format=custom --no-owner --no-acl --file /tmp/rehabcrm-backup.dump "$database_url"
  docker compose -f "$compose_file" cp "postgres:/tmp/rehabcrm-backup.dump" "$dump_file"
  docker compose -f "$compose_file" exec -T postgres rm -f /tmp/rehabcrm-backup.dump >/dev/null
else
  pg_dump --format=custom --no-owner --no-acl --file "$dump_file" "$database_url"
fi
age --encrypt --recipient "$BACKUP_ENCRYPTION_RECIPIENT" --output "$BACKUP_OUTPUT_PATH" "$dump_file"

test -s "$BACKUP_OUTPUT_PATH"
echo "Encrypted PostgreSQL backup completed."
