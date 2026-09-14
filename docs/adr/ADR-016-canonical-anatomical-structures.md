# ADR-016: Canonical anatomical structures

## Context

The three GLBs contain thousands of useful but renderer-owned node and mesh names. Clinical records, measurements, goals, and exercise prescriptions need stable structure identity across model versions.

## Decision

Use `AnatomicalStructure` as a model-independent, hierarchical clinical vocabulary. A version-specific `AnatomicalModelStructureMapping` links one render node/primitive to one canonical structure. Mapping rows record `EXACT`, `HIGH_CONFIDENCE`, or `MANUAL_REQUIRED`; runtime clinical anchoring accepts only the first two.

The Phase 7 seed promotes a deliberately small mapping set where English names and explicit `.l`/`.r` node suffixes agree with world-space X side. All other mesh instances stay in the generated manual-review report.

## Consequences

- GLB naming does not become a clinical API.
- Measurements, goals, and prescriptions continue to use the established region/laterality semantics and are resolved to structures at query time.
- Broader coverage requires reviewed mapping additions, not keyword guesses at runtime.
