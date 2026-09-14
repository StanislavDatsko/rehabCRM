# Patient CRM (Phase 3 — administrative core)

Staff-managed **administrative** patient records. This is not a clinical chart and not a patient-facing product.

Related: [domain-model.md](./domain-model.md), [erd.md](./erd.md), [ADR-008](../adr/ADR-008-patient-concurrency.md), [ADR-009](../adr/ADR-009-clinical-vs-administrative-projections.md), [access-control.md](../security/access-control.md).

## 1. Product boundary

| In scope (Phase 3) | Out of scope |
| --- | --- |
| Create / list / search / filter / sort | Rehabilitation plans, assessments, measurements |
| Administrative profile read/update | Clinical notes |
| Status lifecycle (no hard delete) | Appointments / encounters |
| Responsible practitioner assignment | 3D annotations / heatmaps |
| Administrative history (mutation audit) | Patient portal / patient authentication |
| Org-scoped authorization + projections | Elasticsearch, FHIR server |

**Never:** `Patient` → `User`, passwords, `PATIENT` role, patient sessions, or clinical columns on `Patient`.

## 2. Fields

### Required (create)

- `firstName`
- `lastName`

### Optional (create / update)

| Field | Notes |
| --- | --- |
| `middleName` | |
| `dateOfBirth` | Calendar `DATE` only (not timestamptz). Whether required for desk workflows is [Q21](../OPEN_QUESTIONS.md) |
| `sex` | Coded `FEMALE \| MALE \| OTHER \| UNKNOWN`; optional (aligns with Q7) |
| `phoneDisplay` / `phoneNormalized` | Display as entered; normalized E.164-compatible when parseable. Whether phone is required is [Q21](../OPEN_QUESTIONS.md) |
| `email` | Optional; format-validated; stored trimmed / lowercased for search consistency (document if semantics change) |
| Address (`line1`, `line2`, `city`, `region`, `postalCode`, `countryCode`) | Incomplete addresses allowed; no geocoding |
| Emergency contact (`name`, `phone`, `relationship`) | Embedded on Patient for Phase 3; separate entity deferred |
| `responsiblePractitionerId` | Nullable; must pass practitioner validation when set |
| `internalReferenceNumber` | Optional human-friendly org-unique reference; **generation deferred** (see §5) |

### Provenance / concurrency

- `organizationId` — from authenticated principal (never trusted from client body)
- `status` — see §3
- `version` — optimistic concurrency ([ADR-008](../adr/ADR-008-patient-concurrency.md))
- `createdByUserId`, `updatedByUserId`, `createdAt`, `updatedAt`

### Explicitly deferred / forbidden on Patient

Passport / national ID / insurance, diagnosis, pain scores, assessments, notes, plan references, anatomy data.

## 3. Status semantics

No boolean `isActive`. Status is workflow state:

| Status | Meaning | Typical use |
| --- | --- | --- |
| `ACTIVE` | Currently receiving (or expected to receive) services | Default on create |
| `INACTIVE` | Temporarily not receiving services | Pause without archiving |
| `COMPLETED` | Rehabilitation relationship finished | Closed successfully |
| `ARCHIVED` | Retained for history; out of normal active lists | Long-term retention; not hard delete |

Normal UI **must not** hard-delete patients. Legal erasure is a separate controlled process (compliance gap analysis).

Status changes use an explicit command (`PATCH .../status`) so transitions are audited distinctly from administrative field edits.

## 4. No patient authentication

Patients are managed records. Identity & access context does not include Patient principals. Staff authenticate via IdP; authorization uses membership + permissions.

## 5. Internal reference number

Optional `internalReferenceNumber` (unique per `organizationId` when present).

**Phase 3 decision:** store and search the field if provided; **do not auto-generate** `RC-YYYY-######` yet. Naive `count(*) + 1` is unsafe under concurrency. Safe generation (sequence / advisory lock / dedicated counter table) is deferred until product requires clinic-facing numbers.

## 6. Organization isolation

Every read/write/list/search/duplicate-check scopes by `principal.organizationId`.

```text
findFirst({ where: { id, organizationId } })
```

Missing or cross-org UUID → **404** (existence concealment), same pattern as Phase 2 resource checks. Client `organizationId` is ignored.

`SYSTEM_ADMIN` without org membership remains blocked from patient routes (Q17).

## 7. Responsible practitioner validation

When `responsiblePractitionerId` is set:

1. Practitioner row exists.
2. `practitioner.organizationId === patient.organizationId`.
3. Practitioner `status === ACTIVE` (for assign / change).

Cross-org UUID guesses fail validation (do not attach foreign practitioners). Clearing the assignment (null) is allowed when policy permits update.

## 8. List, search, sort, pagination

### Offset pagination

Phase 3 uses **page + pageSize** (offset) with server-side `skip`/`take` and a total count.

**Rationale:** clinic patient lists are modest; staff UX needs page numbers and totals; cursor pagination adds complexity without clear benefit until volumes or deep-scroll UX demand it. Do not load all rows into memory.

Deterministic default sort: e.g. `lastName`, `firstName`, `id` (id as tiebreaker).

### Sort whitelist

Only: `lastName`, `firstName`, `createdAt`, `updatedAt`, `dateOfBirth`, `status` (plus fixed direction). Never pass raw client strings into `ORDER BY`.

### Search

PostgreSQL `ILIKE` / normalized equality over administrative fields: names, phone (normalized), email, optional internal reference. No Elasticsearch (roadmap non-goal).

**Ukrainian text caveat:** default Postgres `ILIKE` / btree indexes do **not** fully solve Ukrainian case folding, accent/apostrophe variants, or transliteration (`Київ` vs `Kyiv`). Phase 3 indexes support common prefix/filter paths (`organizationId, status, lastName, firstName, id`, phone, email). Richer normalization (`unaccent`, ICU collation, generated search columns) is a follow-up when real clinic data shows gaps — do not assume current indexes make Ukrainian search “solved.”

## 9. Duplicate detection (non-blocking)

Do **not** enforce uniqueness on `(name, DOB)`.

**Architecture:** before create (and optionally before critical contact updates), run org-scoped candidate queries, e.g.:

- same `phoneNormalized`
- same normalized `email`
- same full name + `dateOfBirth` (when DOB present)

Return **warnings** (potential matches: id, display name, DOB, status) — never auto-merge, never block create solely on soft match.

**Phase 3 UI:** if shipping a full warning UX delays the slice, implement the detection port / response shape and document deferred UI (create may proceed with optional `acknowledgeDuplicateWarning`). Aligns with Q10.

## 10. Concurrency

Integer `version` on Patient. Updates include expected version; mismatch → **409 Conflict**. See [ADR-008](../adr/ADR-008-patient-concurrency.md).

## 11. Audit

Mutation + generic `AuditEvent` (`entityType = "Patient"`) in **one transaction**. Actions:

- `PATIENT_CREATED`
- `PATIENT_ADMINISTRATIVE_UPDATED`
- `PATIENT_STATUS_CHANGED`
- `PATIENT_RESPONSIBLE_PRACTITIONER_CHANGED`

Metadata is **controlled**: `changedFields`, optional safe before/after for non-sensitive enums/ids, `statusChange`, `requestId`. Do **not** dump full patient JSON / address / phone / emergency contact into audit.

`PATIENT_VIEWED` is **not** required in Phase 3 (noise vs value); revisit for sensitive clinical access later.

Administrative history UI maps events to Ukrainian labels; no IP/UA in patient-facing history.

## 12. Projections and permissions

Explicit administrative DTO only in Phase 3 ([ADR-009](../adr/ADR-009-clinical-vs-administrative-projections.md)). Clinical permission may exist on roles but clinical fields/endpoints are not implemented.

Permissions (dotted, contracts): `patient.read.admin`, `patient.create`, `patient.update.admin`, `patient.change_status`, `patient.read.clinical` (future data).

## 13. AuthorizationProbe retirement

Phase 2 `AuthorizationProbe` was a temporary org-scoped fixture. Phase 3 Patient APIs are the real resource. **Remove** the probe model/route from the product surface; migrate isolation tests to Patient. Do not keep a production table solely for authorization demos.
