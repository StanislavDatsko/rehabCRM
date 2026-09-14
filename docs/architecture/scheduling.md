# Scheduling (Phase 4 — appointments)

Staff-managed **calendar booking** for rehabilitation-center visits. Scheduling is administrative workflow (desk + calendar); it is **not** the clinical chart.

Related: [encounters.md](./encounters.md), [domain-model.md](./domain-model.md), [erd.md](./erd.md), [ADR-010](../adr/ADR-010-appointment-conflict-prevention.md), [access-control.md](../security/access-control.md), [data-flow.md](./data-flow.md).

## 1. Appointment vs Encounter

| Concept | Meaning | Created when |
| --- | --- | --- |
| **Appointment** | A **planned** slot on the calendar (patient, practitioner, time window, optional location/room/type). | Receptionist or admin books via `POST /api/v1/appointments`. |
| **Encounter** | An **actual** rehabilitation-center interaction that occurred (or is occurring). | Specialist starts visit via `POST /api/v1/appointments/:id/start-encounter` — never as a side effect of booking. |

**Cardinality:** one appointment may have **zero or one** encounter (`encounters.appointmentId` is unique). An encounter may later exist **without** an appointment (walk-in — schema-ready, API deferred per [Q8](../OPEN_QUESTIONS.md)).

**FHIR alignment:** maps to `Appointment` vs `Encounter` ([fhir-mapping.md](./fhir-mapping.md)).

## 2. Product boundary

| In scope (Phase 4) | Out of scope (deferred) |
| --- | --- |
| Create / list / reschedule / cancel appointments | Recurring appointment series |
| Practitioner overlap prevention (DB exclusion) | SMS / email reminders |
| Status workflow + optimistic concurrency | Room-level conflict enforcement (warning only later — [Q11](../OPEN_QUESTIONS.md)) |
| Catalog (types, locations, rooms) | Drag-and-drop calendar UX (optional later) |
| Patient appointment summary on profile | Patient portal / self-booking |
| Check-in, confirm, no-show commands | Walk-in encounter without appointment |
| Start encounter from checked-in appointment | Practitioner-scoped calendar read filter (future) |

## 3. Supporting entities

```text
Organization 1 ──* Location 1 ──* Room
Organization 1 ──* AppointmentType
Organization 1 ──* Appointment
Patient 1 ──* Appointment
Practitioner 1 ──* Appointment
```

- **Location** — physical site; carries `timezone` (IANA, default `Europe/Kyiv`).
- **Room** — optional sub-location within a location.
- **AppointmentType** — org-defined label + `defaultDurationMinutes` (UI hint; create still sends explicit `startsAt`/`endsAt`).

All rows are org-scoped. Location, room, and type must be `ACTIVE` when referenced on **new** bookings.

## 4. Appointment fields

| Field | Notes |
| --- | --- |
| `patientId`, `practitionerId` | Required; same org as appointment |
| `startsAt`, `endsAt` | `timestamptz`; see §6 |
| `locationId`, `roomId`, `appointmentTypeId` | Optional |
| `status` | See §5 |
| `reason`, `administrativeNote` | Optional text (500 / 2000 chars) |
| `cancellationReason` | Set on cancel |
| `version` | Optimistic concurrency (same pattern as Patient — [ADR-008](../adr/ADR-008-patient-concurrency.md)) |
| Provenance | `createdByUserId`, `updatedByUserId`, timestamps |

**Duration rules:** 10–480 minutes inclusive. Create rejects start more than **5 minutes** in the past.

## 5. Appointment state machine

Statuses: `SCHEDULED | CONFIRMED | CHECKED_IN | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW`.

```text
SCHEDULED   → CONFIRMED | CHECKED_IN | CANCELLED | NO_SHOW
CONFIRMED   → CHECKED_IN | CANCELLED | NO_SHOW
CHECKED_IN  → IN_PROGRESS          (via start-encounter command)
IN_PROGRESS → COMPLETED            (via encounter complete)
COMPLETED   → (terminal)
CANCELLED   → (terminal)
NO_SHOW     → (terminal)
```

Notes:

- `CONFIRMED` is optional — `SCHEDULED → CHECKED_IN` is allowed (skip confirm step).
- `CHECKED_IN` does **not** auto-create an encounter; reception marks arrival only.
- `IN_PROGRESS` is set **only** when a specialist starts an encounter (see [encounters.md](./encounters.md)).
- Reschedule / field edit allowed only in `SCHEDULED`, `CONFIRMED`, `CHECKED_IN`. Terminal and in-visit rows are immutable via PATCH.

**Blocking statuses** (occupy practitioner calendar for conflict detection): `SCHEDULED`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`. Completed, cancelled, and no-show slots free the practitioner.

Invalid transitions → `APPOINTMENT_INVALID_TRANSITION` (400).

## 6. Timezone policy

### Storage (API + database)

- All instants stored as **`timestamptz(3)`** in PostgreSQL.
- API accepts ISO-8601 **with offset** (`2026-09-02T09:00:00+03:00`).
- Responses serialize instants as UTC ISO strings (`.toISOString()`).

Never store “local time without offset” as the source of truth.

### Display (UI)

- **Organization** has `timezone` (default `Europe/Kyiv`).
- **Location** has its own `timezone` (default `Europe/Kyiv`); exposed on calendar DTOs as `location.timezone`.
- Calendar UI should render slot labels in **location timezone when a location is set**, otherwise organization timezone — **not** the staff browser’s local timezone (clinic operates in center time).
- Use a timezone-aware library (e.g. `date-fns-tz`) on the frontend; backend remains offset-aware UTC storage.

## 7. Patient schedulability

Before creating an appointment, the patient must exist in the org and have a schedulable status:

| Patient status | New appointment allowed? |
| --- | --- |
| `ACTIVE` | Yes |
| `INACTIVE` | Yes (paused care may still need follow-up visits) |
| `COMPLETED` | No → `PATIENT_NOT_SCHEDULABLE` |
| `ARCHIVED` | No → `PATIENT_NOT_SCHEDULABLE` |

No warning is emitted for `INACTIVE` in Phase 4; product may add a desk warning later.

## 8. Practitioner availability

New bookings require an **ACTIVE** practitioner in the same organization. Inactive practitioners on historical rows remain readable.

Cross-org UUID guesses → **404** (`PRACTITIONER_NOT_FOUND`). Inactive practitioner → `PRACTITIONER_NOT_AVAILABLE` (400).

## 9. Conflict prevention

Practitioner double-booking is prevented at the database layer via a **GiST exclusion constraint** ([ADR-010](../adr/ADR-010-appointment-conflict-prevention.md)):

- Scope: `(organizationId, practitionerId, time_range)` where ranges overlap (`&&`).
- Half-open range `[)` — adjacent slots (10:00–11:00 then 11:00–12:00) do **not** conflict.
- Applies only when status ∈ blocking set (§5).
- Overlap on insert/update → `APPOINTMENT_TIME_CONFLICT` (409).

Room overlap is **not** enforced in Phase 4 ([Q11](../OPEN_QUESTIONS.md)).

## 10. API surface

Global prefix: `/api/v1`. Mutations require `x-request-id` header for audit correlation.

### Queries

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/appointments/catalog` | `appointment.read` | Active types, locations (+ timezone), rooms |
| `GET` | `/appointments?from=&to=` | `appointment.read` | Calendar range (max **90 days**); optional filters: `practitionerId`, `patientId`, `status`, `locationId` |
| `GET` | `/appointments/:id` | `appointment.read` | Detail |
| `GET` | `/appointments/patients/:patientId/summary` | `appointment.read` | Upcoming + recent (5) for patient profile |

Calendar query uses overlap semantics: `startsAt < to AND endsAt > from`.

### Mutations

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/appointments` | `appointment.create` | Create (`SCHEDULED`) |
| `PATCH` | `/appointments/:id` | `appointment.update` | Reschedule / edit fields (requires `version`) |
| `POST` | `/appointments/:id/cancel` | `appointment.cancel` | → `CANCELLED` |
| `POST` | `/appointments/:id/confirm` | `appointment.change_status` | → `CONFIRMED` |
| `POST` | `/appointments/:id/check-in` | `appointment.change_status` | → `CHECKED_IN` |
| `POST` | `/appointments/:id/no-show` | `appointment.change_status` | → `NO_SHOW` |
| `POST` | `/appointments/:id/start-encounter` | `encounter.start` | Create encounter + appointment → `IN_PROGRESS` |

**Command-style POST:** status changes are explicit sub-resource commands, not generic `PATCH { status }`. This keeps audit actions distinct and prevents accidental transitions.

Encounter completion: `POST /api/v1/encounters/:id/complete` — see [encounters.md](./encounters.md).

### Concurrency

Updates and commands require `version`. Stale version → `APPOINTMENT_UPDATE_CONFLICT` (409). Reschedule audit action: `APPOINTMENT_RESCHEDULED` vs `APPOINTMENT_UPDATED`.

## 11. Audit

Appointment mutations write generic `AuditEvent` rows in the **same transaction**:

- `APPOINTMENT_CREATED`
- `APPOINTMENT_UPDATED` / `APPOINTMENT_RESCHEDULED`
- `APPOINTMENT_CONFIRMED`, `APPOINTMENT_CHECKED_IN`, `APPOINTMENT_MARKED_NO_SHOW`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_COMPLETED`

Metadata is controlled (changed fields, status transitions, ISO timestamps) — not full patient or note text.

## 12. Practitioner calendar scoping (future)

Phase 4 returns org-wide calendar data for any principal with `appointment.read`. **Future tightening:** rehabilitation specialists may see only their own `practitionerId` rows by default; receptionist and org admin retain org-wide views. Permission hooks exist; row-level filter is not enforced yet — document before production if desk privacy requires it.

## 13. Deferred

| Item | Notes |
| --- | --- |
| Recurring series | No schema; explicit non-goal Phase 4 |
| Notifications | `Notification` entity planned; SMS/email are ports |
| Room exclusion constraint | Model exists; enforcement deferred |
| Walk-in encounter | Nullable `appointmentId`; API later |
| Patient-facing booking | Roadmap non-goal |
