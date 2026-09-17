# Domain model (staff-only)

This is the **proposed** conceptual model for RehabCRM. It is not a claim that every entity is implemented. Cardinalities and deletion semantics are evaluated in [erd.md](./erd.md). Phase 3 administrative Patient CRM is detailed in [patient-crm.md](./patient-crm.md). Phase 4 scheduling is detailed in [scheduling.md](./scheduling.md) and [encounters.md](./encounters.md).

Ubiquitous language: Ukrainian UI copy may differ; English names below are the canonical code/domain terms.

## 1. Bounded contexts (logical)

| Context | Owns | Notes |
| --- | --- | --- |
| Identity & access | User, membership, roles, permissions | Staff only; IdP is source of authentication |
| Organization | Organization, Location, Department | Tenant root; not a billing product |
| Care delivery | Patient, Appointment, Encounter | Appointment ≠ Encounter |
| Rehabilitation | Plan, Goal, Phase, Exercise assignment | Version significant plan changes |
| Catalogue | Exercise definitions | Not coupled to a patient |
| Clinical observation | Assessment, Measurement, ClinicalNote | Structured values preferred |
| Anatomy visualization | AnatomicalModel, Structure, BodyAnnotation, HeatmapEntry | Persistence independent of Three.js |
| Records | Document, Attachment | Bytes in object storage |
| Governance | Consent, AuditEvent | Audit is not PHI dump |

Patient context **does not** include authentication.

## 2. Identity (staff)

```text
User
  id
  identityProviderSubject   // stable IdP sub
  email
  displayName
  status                    // ACTIVE | DISABLED
  createdAt, updatedAt

OrganizationMembership
  id
  userId
  organizationId
  role                      // v1: SYSTEM_ADMIN | ORGANIZATION_ADMIN | REHABILITATION_SPECIALIST
  createdAt, updatedAt

Practitioner
  id
  userId                    // unique per org when present
  organizationId
  professionalTitle
  licenseNumber             // optional; policy-dependent
  status
  createdAt, updatedAt
```

Rules:

- Not every `User` is a `Practitioner` (admins, receptionists).
- Rehabilitation specialists are `User` + `Practitioner`.
- `SYSTEM_ADMIN` may exist without an organization membership for break-glass operations; all patient data access still requires an explicit org scope (see open questions).

**Never:** `Patient` → `User`, password fields on Patient, or a `PATIENT` role.

## 3. Organization

```text
Organization 1 ──* Location 1 ──* Room (optional later)
Organization 1 ──* Department (optional later)
Organization 1 ──* OrganizationMembership
Organization 1 ──* Patient
```

First installation may be a single organization. The model still scopes PHI to `organizationId`.

## 4. Patient (managed administrative record)

Patient is a person receiving rehabilitation services, **created and maintained by staff**. Phase 3 stores **administrative** data only — no diagnosis, notes, plans, or assessments on the Patient aggregate.

Minimization: collect only fields justified for care coordination. See [patient-crm.md](./patient-crm.md).

**Required on create:** `firstName`, `lastName`.

**Optional:** middle name, date of birth, sex, phone, email, address, emergency contact, responsible practitioner, internal reference. Whether DOB and/or phone become mandatory is [Q21](../OPEN_QUESTIONS.md).

```text
Patient
  id, organizationId
  firstName, lastName, middleName?
  dateOfBirth?, sex?
  phoneDisplay?, phoneNormalized?
  email?
  address…?, emergencyContact…?
  responsiblePractitionerId?
  status                    // ACTIVE | INACTIVE | COMPLETED | ARCHIVED
  internalReferenceNumber?  // optional; auto-generation deferred
  version
  createdByUserId, updatedByUserId, createdAt, updatedAt
```

Status semantics: `ACTIVE` (in care), `INACTIVE` (temporary pause), `COMPLETED` (relationship finished), `ARCHIVED` (retained, out of normal workflows). No hard delete via normal UI.

Related (later / optional entities): `PatientContact`, `Consent` — not required for Phase 3 core. Emergency contact is embedded for now.

Deletion: **archive / deactivate**, not casual hard-delete. Legal erasure is a controlled process (compliance gap analysis).

Optimistic concurrency: [ADR-008](../adr/ADR-008-patient-concurrency.md). Projections: [ADR-009](../adr/ADR-009-clinical-vs-administrative-projections.md).

## 5. Scheduling vs clinical interaction

**Appointment** — scheduled event (calendar, practitioner, optional location/room/type, time window, status). Created by desk staff; does **not** imply care was delivered.

Statuses (v1): `SCHEDULED | CONFIRMED | CHECKED_IN | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW`. State machine and command-style transitions: [scheduling.md](./scheduling.md).

**Encounter** — actual rehabilitation-center interaction (started/ended timestamps, status). Created only via **start-encounter** command, not by booking or check-in. Details: [encounters.md](./encounters.md).

An appointment may have **zero or one** encounter (`appointmentId` unique on encounter). An encounter **belongs to one patient** and **one organization**. Walk-in encounter without appointment is schema-ready but API-deferred ([Q8](../OPEN_QUESTIONS.md)).

**Timezone:** store all instants as `timestamptz`; display in organization or location IANA timezone — not browser local time.

**Conflicts:** practitioner overlap blocked by PostgreSQL exclusion constraint ([ADR-010](../adr/ADR-010-appointment-conflict-prevention.md)). Room overlap deferred.

**Patient schedulability:** only `ACTIVE` and `INACTIVE` patients may receive new appointments; `COMPLETED` and `ARCHIVED` → `PATIENT_NOT_SCHEDULABLE`.

**IN_PROGRESS on appointment:** set when an encounter is started; appointment returns to `COMPLETED` when encounter completes.

Optimistic concurrency: integer `version` on `Appointment` (same pattern as Patient — [ADR-008](../adr/ADR-008-patient-concurrency.md)).

## 6. Rehabilitation

`RehabilitationPlan` is the aggregate root for a course of care:

- stable patient, responsible specialist, lifecycle status (`DRAFT | ACTIVE | PAUSED | COMPLETED | CANCELLED`), current-revision pointer, and optimistic version
- immutable published revisions containing dates, goals, clinician-defined phases, and patient-specific exercise prescriptions
- one editable draft revision at most; explicit publish advances the current pointer
- prescription-level precautions and progression/regression criteria

`ExerciseDefinition` (catalogue) is independent of `ExercisePrescription` (revision- and patient-specific parameters).

Future `ExerciseSession` / `ExerciseResult` records, if introduced, will be entered **by staff** in this product (no patient self-reporting).

Phase 6 implements the plan as a stable lifecycle identity plus immutable published `RehabilitationPlanRevision` records. Each revision owns structured goals, clinician-defined phases, and patient-specific prescriptions. Reusable `ExerciseDefinition` rows remain separate from prescription dosage. See [rehabilitation-plans.md](./rehabilitation-plans.md), [rehabilitation-goals.md](./rehabilitation-goals.md), and [exercise-library.md](./exercise-library.md).

## 7. Assessments and measurements (Phase 5)

`Assessment` is the lifecycle aggregate (`DRAFT | COMPLETED | VOIDED`); `Measurement` is an individual typed observation. Definitions and immutable template revisions provide stable semantics, while each measurement snapshots its meaning-bearing definition metadata. Completed values are never silently overwritten. See [assessments.md](./assessments.md), [measurements.md](./measurements.md), and [ADR-011](../adr/ADR-011-structured-clinical-measurements.md).

## 8. Anatomy

- `AnatomicalModel` + immutable `AnatomicalModelVersion` — asset family, private storage key, checksum, attribution, and explicit alignment transform. No hardcoded third-party viewer URLs.
- `AnatomicalStructure` — stable hierarchical clinical vocabulary, not Three.js runtime UUIDs.
- `AnatomicalModelStructureMapping` — reviewed, model-version-specific node/primitive bridge.
- `BodyAnnotation` — clinician observation (not a diagnosis). Types such as `PAIN`, `INJURY`, … are labels for recorded observations.
- `BodyAnnotationStatusHistory` — append-only lifecycle evidence for create/resolve/void.
- Heatmap values are derived at render time, **not** stored as a second clinical record.

Position persistence: exact model version + mapping + triangle/barycentric anchor + same-version local fallback ([3d-annotation-model.md](./3d-annotation-model.md), ADR-004).

## 9. Clinical notes and documents

`ClinicalNote`: specialist-authored; revision history; permission-gated separately from administrative patient fields.

`Document` / `Attachment`: metadata + object-storage key; access via authorized signed URLs.

## 10. Audit and notifications

`AuditEvent` (Phase 3): generic append-oriented event using `entityType` + `entityId`. Patient mutations store controlled metadata (changed fields — not full PHI replicas) in the same transaction as the mutation. Future modules reuse this foundation; patient mutations never rely on best-effort post-commit inserts.

`Notification`: staff in-app first; email/SMS are ports, not domain core.

## 11. Invariants (non-negotiable)

1. Every PHI row has `organizationId` (except global catalogue/anatomy **templates** that contain no patient data).
2. Patient records have no authentication attributes.
3. Clinical artifacts are not deleted as a casual UI action.
4. Heatmaps and annotations never claim diagnostic certainty.
5. Authorization decisions are made in the API using membership, permissions, and care relationships — not from the client payload alone.
6. Administrative and clinical patient projections stay separate ([ADR-009](../adr/ADR-009-clinical-vs-administrative-projections.md)).

## 12. Progress and clinical reports (Phase 8)

Progress is a read model over existing clinical aggregates, not a stored score. `ClinicalReport` is the only new patient artifact: it records type/status, bounded period, selected sections, source version metadata, authoring practitioner/user, immutable private-object key, template version, and void/failure facts. Report narrative exists in the report configuration/PDF and is excluded from generic logs and audit metadata. See [progress-analytics.md](./progress-analytics.md) and [clinical-reports.md](./clinical-reports.md).
