#!/bin/sh
set -eu

: "${S3_ENDPOINT:?S3_ENDPOINT is required}"
: "${S3_ACCESS_KEY:?S3_ACCESS_KEY is required}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY is required}"
: "${S3_BUCKET_DOCUMENTS:?S3_BUCKET_DOCUMENTS is required}"
: "${S3_BUCKET_MODELS:?S3_BUCKET_MODELS is required}"
: "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT is required}"
: "${BACKUP_S3_ACCESS_KEY:?BACKUP_S3_ACCESS_KEY is required}"
: "${BACKUP_S3_SECRET_KEY:?BACKUP_S3_SECRET_KEY is required}"
: "${BACKUP_S3_PREFIX:?BACKUP_S3_PREFIX is required}"

mc alias set rehab-source "$S3_ENDPOINT" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
mc alias set rehab-backup "$BACKUP_S3_ENDPOINT" "$BACKUP_S3_ACCESS_KEY" "$BACKUP_S3_SECRET_KEY" >/dev/null
mc mirror --overwrite --preserve "rehab-source/$S3_BUCKET_DOCUMENTS" "rehab-backup/$BACKUP_S3_PREFIX/documents"
mc mirror --overwrite --preserve "rehab-source/$S3_BUCKET_MODELS" "rehab-backup/$BACKUP_S3_PREFIX/models"
echo "Object-storage backup mirror completed. Destination versioning and encryption must be enabled."
