# Anatomy asset pipeline

```text
assets/anatomy/source/*.glb (immutable, ignored)
  → pnpm anatomy:inspect
  → inspection JSON + computational alignment report
  → pnpm anatomy:mappings
  → pnpm anatomy:mappings:validate
  → optional reviewed processing into processed/ as a new version
  → pnpm anatomy:import -- --apply
  → private MinIO/S3 model bucket
  → AnatomicalModelVersion metadata
  → short-lived signed GET URL
  → lazy patient body-map viewer
```

`pnpm anatomy:import` is a non-mutating checksum dry run by default. `--apply` verifies hashes, avoids an upload when object metadata already has the same checksum, applies web-origin GET/HEAD CORS, uploads without exposing credentials, and upserts development metadata.

No Phase 7 optimization was promoted: pruning, merging, Draco, Meshopt, and quantization can alter node identity or triangle topology. Any future processed binary must retain its source, receive a new checksum/version/storage key, rerun inspection/mapping validation, and pass visual comparison before activation.
