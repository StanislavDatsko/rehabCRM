# ADR-018: Anatomical model versioning

## Context

Triangle indices and node topology can change after export or optimization. Replacing a GLB in place could silently move clinical markers.

## Decision

Every uploaded model is an immutable `AnatomicalModelVersion` with SHA-256 checksum, byte size, private storage key, source metadata, and explicit position/rotation/scale. Only one version per model may be `ACTIVE`. An annotation references the exact version and mapping used at creation.

Never overwrite an object for a released storage key. A new or optimized binary receives a new version and must pass inspection plus mapping review before activation. Old annotations remain textual if their exact model version cannot be rendered.

## Consequences

- Storage lifecycle rules must retain referenced versions.
- Version activation is an operational/admin workflow, not a viewer-side choice.
- Automatic cross-version reprojection is prohibited.
