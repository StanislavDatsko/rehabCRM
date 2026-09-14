# ADR-011: Structured clinical measurements and immutable template revisions

- Status: Accepted
- Date: 2026-09-02

## Decision

Store an assessment as a lifecycle aggregate and each observation as a separate typed measurement. Definitions have stable codes and system/org scope. Templates are immutable revisions. Measurements snapshot meaning-bearing definition metadata. Completed assessments are immutable; Phase 5 corrections void the incorrect record and create a replacement.

Draft saves replace the submitted measurement set atomically under assessment optimistic concurrency. `sequenceNumber` supports future repeated trials. Clinical values are kept out of generic audit metadata.

## Consequences

Measurements remain comparable across time and ready for future analytics and anatomy mapping. Historical records remain interpretable if labels or templates evolve. More sophisticated amendments, standard terminology bindings, approved clinical protocols, and template authoring remain explicit future work.

