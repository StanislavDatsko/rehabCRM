# ADR-010: Appointment conflict prevention (practitioner exclusion)

## Context

Rehabilitation centers schedule one practitioner per patient slot. Concurrent staff (receptionists, admins) may book or reschedule appointments at the same time. Application-level “check then insert” races allow double-booking under load.

Room-level conflicts matter for operations but are lower priority than practitioner overlap ([Q11](../OPEN_QUESTIONS.md)).

## Decision

- Enforce **practitioner calendar conflicts in PostgreSQL** using a **GiST exclusion constraint** on `appointments`, not only application checks.
- Enable `btree_gist` extension.
- Add a **generated stored column** `time_range tstzrange` = `tstzrange(startsAt, endsAt, '[)')` (half-open interval).
- Constraint `appointments_no_practitioner_overlap`:

```sql
EXCLUDE USING gist (
  "organizationId" WITH =,
  "practitionerId" WITH =,
  "time_range" WITH &&
)
WHERE ("status" IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'));
```

- Also enforce `CHECK ("endsAt" > "startsAt")`.
- Map Postgres exclusion violation (SQLSTATE `23P01`, constraint name) to API **`APPOINTMENT_TIME_CONFLICT` (409)** with a stable message.
- **Blocking statuses** align with the constraint `WHERE` clause and the domain `BLOCKING_APPOINTMENT_STATUSES` constant.
- **Room overlap:** not enforced in Phase 4; optional warning UI or future exclusion constraint.

## Alternatives

- **Application-only overlap query** — rejected (TOCTOU race under concurrent bookings).
- **Serializable transactions only** — rejected (harder to reason about; exclusion is declarative and testable).
- **Closed interval `[ ]`** — rejected; adjacent back-to-back appointments would falsely conflict.
- **Global practitioner exclusion (ignore org)** — rejected; practitioners are org-scoped entities.

## Consequences

- Migrations must use raw SQL for the exclusion constraint ([ADR-002](./ADR-002-postgresql-prisma.md)); Prisma schema documents intent but DB enforces overlap.
- Reschedule/cancel/status change that frees a slot must update status or times so the row falls outside the `WHERE` predicate (e.g. `CANCELLED` no longer participates).
- `IN_PROGRESS` appointments block the practitioner until completed — intentional (visit in session).
- Integration tests should assert 409 on overlap; unit tests cover status sets separately.
- Future room exclusion can mirror the pattern with `(organizationId, roomId, time_range)` when product requires hard blocking.
