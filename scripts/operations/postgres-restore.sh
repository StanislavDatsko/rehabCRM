#!/bin/sh
set -eu

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${BACKUP_INPUT_PATH:?BACKUP_INPUT_PATH is required}"
: "${BACKUP_IDENTITY_FILE:?BACKUP_IDENTITY_FILE is required}"
: "${ALLOW_RESTORE:?Set ALLOW_RESTORE=isolated-target after verifying the destination}"

test "$ALLOW_RESTORE" = "isolated-target" || { echo "Restore confirmation did not match." >&2; exit 2; }
case "$BACKUP_INPUT_PATH" in
  /*.age) ;;
  *) echo "BACKUP_INPUT_PATH must be an absolute .age file" >&2; exit 2 ;;
esac

database_url=$(printf '%s' "$RESTORE_DATABASE_URL" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//')
dump_file=$(mktemp "${TMPDIR:-/tmp}/rehabcrm-postgres-restore.XXXXXX")
trap 'rm -f "$dump_file"' EXIT HUP INT TERM

age --decrypt --identity "$BACKUP_IDENTITY_FILE" --output "$dump_file" "$BACKUP_INPUT_PATH"
if [ "${PG_CLIENT_MODE:-auto}" = "docker" ] || { [ "${PG_CLIENT_MODE:-auto}" = "auto" ] && command -v docker >/dev/null 2>&1; }; then
  compose_file="${COMPOSE_FILE:-infra/docker/docker-compose.yml}"
  docker compose -f "$compose_file" cp "$dump_file" postgres:/tmp/rehabcrm-restore.dump
  docker compose -f "$compose_file" exec -T postgres pg_restore --dbname "$database_url" --no-owner --no-acl --exit-on-error /tmp/rehabcrm-restore.dump
  docker compose -f "$compose_file" exec -T postgres rm -f /tmp/rehabcrm-restore.dump >/dev/null
else
  pg_restore --dbname "$database_url" --no-owner --no-acl --exit-on-error "$dump_file"
fi

echo "PostgreSQL restore completed; run the documented integrity checks before use."
