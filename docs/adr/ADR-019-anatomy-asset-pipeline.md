# ADR-019: Anatomy asset pipeline

## Context

Large licensed GLBs should not be bundled in Next.js, exposed in a public directory, or edited without provenance and topology review.

## Decision

Keep immutable originals under ignored `assets/anatomy/source/`, derived artifacts under ignored `assets/anatomy/processed/`, and commit only inspection/mapping reports. `pnpm anatomy:inspect` validates GLB v2 headers, hashes, names, triangle counts, bounds, and layer alignment. `pnpm anatomy:mappings` regenerates auditable candidates and the manual-review queue.

`pnpm anatomy:import -- --apply` verifies source checksums, uploads to the private model bucket, configures browser GET/HEAD CORS for the configured web origin, and upserts metadata. The API returns short-lived signed GET URLs. The dry run is the default.

No mesh optimization is applied to the Phase 7 source set: reducing/merging geometry would change triangle topology, and no visual regression environment or cleared production license was available. Future optimized files must be new versions.

## Consequences

- Source GLBs never enter the application bundle or repository history.
- Model access remains authenticated at URL issuance and time-limited at object storage.
- CDN delivery can be added later without changing clinical references.
