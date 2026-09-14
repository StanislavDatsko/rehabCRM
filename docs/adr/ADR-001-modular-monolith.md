# ADR-001: Modular monolith

## Context

RehabCRM is a production staff system with transactional workflows (scheduling, plans, notes, annotations) and a small initial team. Microservices would add network failure modes, distributed transactions, and operational cost before product-market fit of the clinical workflow.

## Decision

Ship a **modular monolith**: one NestJS deployable, modules with explicit boundaries; Next.js as the staff UI. Extract services later only if a module’s scale or team boundary requires it.

## Alternatives

- Microservices from day one — rejected (complexity, consistency).
- Modular monolith with event-driven everything internally — rejected as ceremony; use in-process calls and transactions; events later for notifications/audit fan-out if needed.
- Separate “anatomy microservice” early — rejected; 3D is UI-heavy with a thin persistence API.

## Consequences

- Simple deployment and debugging; PostgreSQL transactions across modules.
- Discipline required: no cross-module table grabs; public module APIs only.
- Reporting should stay a separate *logical* read path later without requiring a separate process in v1.
