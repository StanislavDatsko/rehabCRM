# Backup and recovery runbook

## PostgreSQL

Schedule encrypted logical backups with `pnpm db:backup` and provider-native continuous recovery. The script requires an absolute `.age` output path and an age recipient, uses custom-format `pg_dump`, and does not put credentials on the command line beyond the explicit database URL environment variable. Store keys separately from backups.

Restore only into a verified isolated target with `ALLOW_RESTORE=isolated-target pnpm db:restore`. The destination must be empty. After restore, run migration status, row-count and foreign-key checks, synthetic login/API smoke tests, audit-event continuity checks, and a sample immutable-report/model retrieval.

## Object storage

Enable server-side encryption, object versioning or immutable replication, access logging, lifecycle controls, and separate credentials for documents and models. `pnpm object-storage:backup` mirrors both buckets to a versioned backup endpoint. `ALLOW_OBJECT_RESTORE=isolated-target pnpm object-storage:restore` restores to new test buckets only. Compare object counts, sizes, hashes/ETags where valid, report metadata, and signed retrieval.

## Rehearsal evidence

At least quarterly and before pilot, record source recovery point, target isolation, operator, commands/procedure version, start/end time, integrity checks, failures, actual RPO/RTO, and cleanup. The clinic and operations owner must approve target RPO/RTO values; until then recovery is a pilot blocker.
