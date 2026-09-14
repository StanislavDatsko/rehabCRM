#!/bin/sh
set -eu

: "${RESTORE_S3_ENDPOINT:?RESTORE_S3_ENDPOINT is required}"
: "${RESTORE_S3_ACCESS_KEY:?RESTORE_S3_ACCESS_KEY is required}"
: "${RESTORE_S3_SECRET_KEY:?RESTORE_S3_SECRET_KEY is required}"
: "${RESTORE_BUCKET_DOCUMENTS:?RESTORE_BUCKET_DOCUMENTS is required}"
: "${RESTORE_BUCKET_MODELS:?RESTORE_BUCKET_MODELS is required}"
: "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT is required}"
: "${BACKUP_S3_ACCESS_KEY:?BACKUP_S3_ACCESS_KEY is required}"
: "${BACKUP_S3_SECRET_KEY:?BACKUP_S3_SECRET_KEY is required}"
: "${BACKUP_S3_PREFIX:?BACKUP_S3_PREFIX is required}"
: "${ALLOW_OBJECT_RESTORE:?Set ALLOW_OBJECT_RESTORE=isolated-target after verifying the destination}"

test "$ALLOW_OBJECT_RESTORE" = "isolated-target" || { echo "Restore confirmation did not match." >&2; exit 2; }
mc alias set rehab-restore "$RESTORE_S3_ENDPOINT" "$RESTORE_S3_ACCESS_KEY" "$RESTORE_S3_SECRET_KEY" >/dev/null
mc alias set rehab-backup "$BACKUP_S3_ENDPOINT" "$BACKUP_S3_ACCESS_KEY" "$BACKUP_S3_SECRET_KEY" >/dev/null
mc mirror --overwrite --preserve "rehab-backup/$BACKUP_S3_PREFIX/documents" "rehab-restore/$RESTORE_BUCKET_DOCUMENTS"
mc mirror --overwrite --preserve "rehab-backup/$BACKUP_S3_PREFIX/models" "rehab-restore/$RESTORE_BUCKET_MODELS"
echo "Object-storage restore completed; verify counts, hashes, and signed retrieval before use."
