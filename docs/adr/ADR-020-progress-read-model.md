# ADR-020: Composed progress read model

## Context

Longitudinal views combine several clinical aggregates, but duplicating their facts in a new mutable analytics table would create competing truth and unsafe synchronization rules.

## Decision

Build bounded, read-only projections directly from existing organization-scoped domain records. Keep summary, measurement, goal, plan-history, body-annotation, and timeline endpoints separate. Apply comparability and occurrence-time rules in one API module.

## Consequences

Clinical writes remain in their owning modules and analytics cannot auto-complete goals. Queries may become expensive at scale; materialized projections can be added later behind the same contracts after profiling.
