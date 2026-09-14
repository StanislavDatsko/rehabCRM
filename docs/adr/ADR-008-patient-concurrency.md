# ADR-008: Patient optimistic concurrency

## Context

Receptionists and specialists may edit the same administrative patient record concurrently (contacts, responsible practitioner, status). Silent last-write-wins loses desk work and produces incorrect audit trails.

## Decision

- Store an integer `version` on `Patient`, starting at `1`.
- Every administrative update and status change requires the client’s expected `version`.
- Persist with a conditional update (`WHERE id AND organizationId AND version = expected`), then increment `version`.
- If no row is updated (stale version or concurrent change) → **409 Conflict** with a stable API error code and a safe message (reload / retry).
- Do **not** overwrite based on `updatedAt` alone; integer version is the contract.
- Concurrency check runs inside the same transaction as the mutation and generic `AuditEvent` insert.

## Alternatives

- Last-write-wins — rejected (data loss, weak audit).
- Pessimistic row locks for every edit — rejected (poor UX for long-lived forms).
- `updatedAt` precondition only — rejected (clock skew / equal timestamps; weaker client contract).

## Consequences

- UI must load `version` with the form and resubmit it; handle 409 with refresh.
- Status changes and field updates both participate in the same versioning scheme.
- Clients must not invent or ignore version.
