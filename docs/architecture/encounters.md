# Encounters (Phase 4 — clinical visit start)

An **Encounter** records that a rehabilitation-center interaction **actually occurred** (or is in progress). It is distinct from the **Appointment** that planned the slot.

Related: [scheduling.md](./scheduling.md), [domain-model.md](./domain-model.md), [erd.md](./erd.md), [access-control.md](../security/access-control.md).

## 1. Why separate from Appointment?

| Appointment | Encounter |
| --- | --- |
| Calendar / desk workflow | Clinical workflow anchor |
| Booked ahead; may be cancelled or no-show | Exists only when care delivery starts |
| Receptionist-heavy permissions | Specialist-heavy permissions |
| May never produce an encounter | May exist without appointment later (walk-in — [Q8](../OPEN_QUESTIONS.md)) |

Booking **never** creates an encounter. Check-in **never** creates an encounter. Only **`start-encounter`** does.

## 2. Fields

```text
Encounter
  id, organizationId
  patientId, practitionerId          // copied from appointment at start
  appointmentId?                     // unique when set (0..1 per appointment)
  startedAt                          // timestamptz; server time at start
  endedAt?                           // set on complete
  status                             // IN_PROGRESS | COMPLETED | CANCELLED
  createdByUserId, updatedByUserId, createdAt, updatedAt
```

Future clinical modules (notes, assessments, annotations) may attach optional `encounterId` context.

## 3. Encounter state machine

Statuses: `IN_PROGRESS | COMPLETED | CANCELLED`.

Phase 4 implements:

```text
(start)     → IN_PROGRESS     via POST .../appointments/:id/start-encounter
IN_PROGRESS → COMPLETED       via POST .../encounters/:id/complete
```

`CANCELLED` is reserved for future abort-in-progress workflows; no API in Phase 4.

### Linked appointment transitions

When encounter starts from an appointment:

1. Appointment must be in a state that allows `→ IN_PROGRESS` (typically `CHECKED_IN`).
2. Transaction: create `Encounter` (`IN_PROGRESS`, `startedAt = now`) + appointment `→ IN_PROGRESS`.
3. Appointment enters **blocking** status for practitioner calendar (exclusion constraint).

When encounter completes:

1. Encounter `→ COMPLETED`, `endedAt = now`.
2. If linked appointment exists and transition `IN_PROGRESS → COMPLETED` is valid, appointment `→ COMPLETED` in the **same transaction** (optimistic version on appointment).
3. Completed appointment no longer blocks practitioner slots.

## 4. Start encounter flow

```text
Specialist (encounter.start)
  → POST /api/v1/appointments/:id/start-encounter  { version }
  → Validate appointment org, status, no existing encounter
  → Transaction:
       Encounter.create(IN_PROGRESS)
       Appointment.update(IN_PROGRESS, version++)
       Audit ENCOUNTER_STARTED
  → EncounterResponse
```

**Double-start protection:** unique index on `encounters.appointmentId`. Race → `ENCOUNTER_ALREADY_EXISTS` (409).

**Permissions:** `encounter.start` — rehabilitation specialist only in v1. Receptionist cannot start clinical visits.

## 5. Complete encounter flow

```text
Specialist (encounter.complete)
  → POST /api/v1/encounters/:id/complete
  → Validate IN_PROGRESS
  → Transaction:
       Encounter.update(COMPLETED, endedAt)
       Appointment.update(COMPLETED) if linked
       Audit ENCOUNTER_COMPLETED, APPOINTMENT_COMPLETED
  → EncounterResponse
```

Idempotent: completing an already-completed encounter returns current state.

Invalid state → `ENCOUNTER_INVALID_TRANSITION` (400).

## 6. API surface

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/encounters/:id` | `encounter.read` | Detail |
| `POST` | `/encounters/:id/complete` | `encounter.complete` | Finish visit |
| `POST` | `/appointments/:id/start-encounter` | `encounter.start` | Begin visit (see scheduling.md) |

Org-scoped lookup: cross-org UUID → **404** (`ENCOUNTER_NOT_FOUND`).

## 7. Permissions (v1)

| Role | Start | Complete | Read |
| --- | --- | --- | --- |
| `REHABILITATION_SPECIALIST` | Yes | Yes | Yes |
| `ORGANIZATION_ADMIN` | Yes | Yes | Yes |
| `SYSTEM_ADMIN` | Yes | Yes | Yes |

Administrators receive the same clinical permissions through role composition; domain-specific practitioner identity remains separate.

## 8. Audit

- `ENCOUNTER_STARTED` — metadata: `appointmentId`, `startedAt`
- `ENCOUNTER_COMPLETED` — metadata: `endedAt`, `appointmentId`
- `APPOINTMENT_COMPLETED` — when linked appointment closes with encounter

## 9. Deferred

| Item | Notes |
| --- | --- |
| Walk-in encounter (no appointment) | Schema supports null `appointmentId`; API + UI later |
| Encounter cancel / abort | `CANCELLED` enum value reserved |
| Care-relationship gate on start | v1: org + permission; tighten with [Q5](../OPEN_QUESTIONS.md) |
| Clinical artifacts on encounter | Phase 5+ (notes, assessments) |
