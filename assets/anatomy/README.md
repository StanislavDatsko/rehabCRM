# Anatomy assets

The development source files in `source/` originate from Z-Anatomy exports prepared before Phase 7:

| Role | Expected filename | SHA-256 of inspected development file |
| --- | --- | --- |
| Muscular layer | `muscles.glb` | `b64dc4fec543516b89d9eb9be76f624aeafce1fbedffd158ddf40f6b7ce4b27d` |
| Skeletal layer | `skeleton.glb` | `ea22db275eca4d88910aad7e181d2a397daee5845884ddf5d4b87b16396fd07e` |
| Joint layer | `joints.glb` | `2c0ffc399ceeabef79f226fab76ccda2e6619475a5555d84a80e573037ff3c9b` |

License and provenance must be verified by legal/product owners before production or commercial deployment. Do not infer clearance from the presence of these files. Required source, source URL, author, license, and attribution metadata is stored on each `AnatomicalModelVersion`.

## Source and generated files

- `source/*.glb` is developer-local, immutable input. Never rewrite, optimize, or rename nodes in place.
- `processed/*.glb` is generated output. A transformation that can change geometry, node identity, or triangle ordering creates a distinct model version.
- `inspection/*.json` contains small, reviewable reports produced by `pnpm anatomy:inspect`.
- `mappings/` contains explicit JSON mapping proposals and a CSV manual-review queue. `MANUAL_REQUIRED` entries are not runtime mappings.

Both source and processed GLBs are ignored by Git. Developers place the three expected filenames in `assets/anatomy/source/`. The import workflow calculates a checksum, uploads a chosen immutable file to the private models bucket, and registers its storage key and provenance in PostgreSQL. Browsers receive only short-lived signed read URLs from the authorized API; MinIO/S3 credentials never enter the web bundle.

No optimization was performed during the initial Phase 7 relocation. The original bytes and checksums were preserved.
