# ADR-022: Immutable server-generated clinical report PDFs

## Context

Reports must remain attributable and reproducible after source records evolve, while browser-generated files are difficult to control and audit.

## Decision

Generate PDFs on the API server from an explicit source snapshot, store them in the private documents bucket, and make completed output immutable. Use short-lived signed downloads and explicit void-with-reason instead of replacement or deletion.

## Consequences

The generated document remains evidence of what was exported. Synchronous generation is initially simple but the persisted `GENERATING` state permits a later queue. Object retention, key rotation, and backup/restore require production policy.
