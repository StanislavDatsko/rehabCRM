# ADR-014: Immutable published rehabilitation-plan revisions

- Status: Accepted
- Date: 2026-09-02

## Decision

Separate plan identity/lifecycle from revision content. A plan has one current published revision and at most one editable draft. Active edits begin by copying the current revision; publishing atomically advances the pointer. Goals, phases, and prescriptions belong to revisions and published rows have no mutation path.

## Consequences

Historical encounters remain interpretable, concurrent saves use the plan version, and publication is an aggregate transaction. Revision creation is explicit and clinically meaningful. Collaborative co-authoring, co-signing, and granular diff storage remain future policy.

