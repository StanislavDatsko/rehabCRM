# ADR-005: Object storage (S3-compatible)

## Context

Clinical documents and GLB assets must not live in PostgreSQL. Local DX needs an S3 API without AWS.

## Decision

- Abstract storage behind an **S3-compatible** port.
- Local: **MinIO**. Production: any S3-compatible provider.
- PostgreSQL stores metadata (key, mime, size, checksum, classification).
- Access: **authorized signed URLs**; private buckets.
- Server generates object keys; clients never choose the bucket path freely.
- Upload validation: size, allow-listed MIME; malware scan as a future port (no-op adapter).
- Anatomical models use the same storage with **license/attribution** metadata; no hardcoded Sketchfab URLs in the app.

## Alternatives

- Files on API local disk — rejected for prod.
- PostgreSQL BYTEA — rejected for large objects.
- Public CDN URLs for PHI documents — rejected.

## Consequences

- Need clock sync for signed URL expiry.
- Web and API must share allowed origin and size limits.
- Backup strategy includes buckets, not only the database.
