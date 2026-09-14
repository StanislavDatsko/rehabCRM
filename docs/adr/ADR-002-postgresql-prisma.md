# ADR-002: PostgreSQL and Prisma

## Context

The system of record must support relational integrity (org scoping, FKs, exclusion constraints for appointments), migrations, and JSON for `surfaceReference` without becoming a document database.

## Decision

- **PostgreSQL** as the only system of record.
- **Prisma** for schema migrations and type-safe access in NestJS.
- Raw SQL / `$queryRaw` allowed for exclusion constraints, heavy reports, or performance — documented, not hidden.
- UUID primary keys; `timestamptz`; explicit DTOs (never return Prisma models from HTTP).

## Alternatives

- TypeORM — capable, but Prisma migrate + TS client is the team default.
- Drizzle — lighter; less Nest ecosystem convention here.
- MongoDB — poor fit for relational authorization and appointments.
- Prisma-only with no raw SQL — too rigid for calendar exclusion indexes.

## Consequences

- Migrations are mandatory; no manual prod DDL.
- N+1 must be avoided via `include`/`select` and query reviews.
- Prisma schema in Phase 1 is minimal; domain tables land with their phases.
