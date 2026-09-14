# ERD proposal (logical)

This is the logical model. Phases 3–5 implement Patient, scheduling/Encounter, and structured Assessment/Measurement respectively. See [patient-crm.md](./patient-crm.md), [scheduling.md](./scheduling.md), [assessments.md](./assessments.md), and [measurements.md](./measurements.md).

Notation: `||` one, `o{` zero-or-more, `|o` zero-or-one.

## 1. Organization and staff

```mermaid
erDiagram
  Organization ||--o{ Location : has
  Organization ||--o{ OrganizationMembership : has
  Organization ||--o{ Practitioner : has
  User ||--o{ OrganizationMembership : holds
  User ||--o| Practitioner : "may be"
  Practitioner }o--|| Organization : scoped
  OrganizationMembership }o--|| Organization : scoped

  Organization {
    uuid id PK
    string name
    string slug UK
    string timezone
    timestamptz createdAt
    timestamptz updatedAt
  }

  Location {
    uuid id PK
    uuid organizationId FK
    string name
    string kind
    timestamptz createdAt
    timestamptz updatedAt
  }

  User {
    uuid id PK
    string identityProviderSubject UK
    string email
    string displayName
    string status
    timestamptz createdAt
    timestamptz updatedAt
  }

  OrganizationMembership {
    uuid id PK
    uuid userId FK
    uuid organizationId FK
    string role
    timestamptz createdAt
  }

  Practitioner {
    uuid id PK
    uuid userId FK
    uuid organizationId FK
    string professionalTitle
    string status
    timestamptz createdAt
    timestamptz updatedAt
  }
```

**Cardinalities**

- User ↔ Organization: many-to-many via membership (a specialist locum across two clinics is possible later; v1 may constrain to one org in policy).
- User ↔ Practitioner: **at most one Practitioner per (user, organization)**.

**Uniques:** `(userId, organizationId)` on membership; `(userId, organizationId)` on Practitioner.

## 2. Patient (no auth) — Phase 3 administrative core

```mermaid
erDiagram
  Organization ||--o{ Patient : scopes
  Practitioner ||--o{ Patient : "responsible for"
  User ||--o{ Patient : "created/updated by"
  Organization ||--o{ AuditEvent : scopes

  Patient {
    uuid id PK
    uuid organizationId FK
    uuid responsiblePractitionerId FK
    string firstName
    string lastName
    string middleName
    date dateOfBirth
    string sex
    string phoneDisplay
    string phoneNormalized
    string email
    string addressLine1
    string city
    string countryCode
    string emergencyContactName
    string emergencyContactPhoneDisplay
    string status
    string internalReferenceNumber
    int version
    uuid createdByUserId FK
    uuid updatedByUserId FK
    timestamptz createdAt
    timestamptz updatedAt
  }

  AuditEvent {
    uuid id PK
    uuid organizationId FK
    uuid actorUserId FK
    string action
    string entityType
    uuid entityId
    string requestId
    jsonb metadata
    timestamptz occurredAt
  }
```

**Phase 3 notes**

- Required create fields: `firstName`, `lastName` only. DOB/phone optionality is product-open ([OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md) Q21).
- No clinical columns on `Patient`. No patient auth attributes.
- Emergency contact is **embedded** (avoid premature normalization). Separate `PatientContact` / `Consent` entities remain future.
- `internalReferenceNumber` optional, unique per org when set; **auto-generation deferred**.
- Responsible practitioner: same org + `ACTIVE` when assigned.
- **Deletion:** status `ARCHIVED` / deactivate — not `deletedAt`. No DELETE API for normal removal.
- Indexes (anticipated): `(organizationId, status, lastName, firstName, id)`, `(organizationId, phoneNormalized)`, `(organizationId, email)`, `(organizationId, updatedAt, id)`. Ukrainian `ILIKE` search is imperfect on stock indexes — see patient-crm.md.

## 3. Appointments and encounters — Phase 4 core

```mermaid
erDiagram
  Organization ||--o{ Location : has
  Organization ||--o{ Room : has
  Organization ||--o{ AppointmentType : defines
  Organization ||--o{ Appointment : scopes
  Location ||--o{ Room : contains
  Location ||--o{ Appointment : "at"
  Room ||--o{ Appointment : "in"
  AppointmentType ||--o{ Appointment : typed
  Patient ||--o{ Appointment : booked
  Practitioner ||--o{ Appointment : assigned
  Appointment ||--o| Encounter : "may result in"
  Patient ||--o{ Encounter : has
  Practitioner ||--o{ Encounter : conducts

  Location {
    uuid id PK
    uuid organizationId FK
    string name
    string status
    string timezone
    timestamptz createdAt
    timestamptz updatedAt
  }

  Room {
    uuid id PK
    uuid organizationId FK
    uuid locationId FK
    string name
    string status
    timestamptz createdAt
    timestamptz updatedAt
  }

  AppointmentType {
    uuid id PK
    uuid organizationId FK
    string name
    int defaultDurationMinutes
    string status
    timestamptz createdAt
    timestamptz updatedAt
  }

  Appointment {
    uuid id PK
    uuid organizationId FK
    uuid patientId FK
    uuid practitionerId FK
    uuid locationId FK
    uuid roomId FK
    uuid appointmentTypeId FK
    string status
    timestamptz startsAt
    timestamptz endsAt
    string reason
    string administrativeNote
    string cancellationReason
    int version
    uuid createdByUserId FK
    uuid updatedByUserId FK
    timestamptz createdAt
    timestamptz updatedAt
  }

  Encounter {
    uuid id PK
    uuid organizationId FK
    uuid patientId FK
    uuid practitionerId FK
    uuid appointmentId FK
    timestamptz startedAt
    timestamptz endedAt
    string status
    uuid createdByUserId FK
    uuid updatedByUserId FK
    timestamptz createdAt
    timestamptz updatedAt
  }
```

**Phase 4 notes**

- `Organization.timezone` (IANA, default `Europe/Kyiv`) and `Location.timezone` drive **display**; all appointment/encounter instants stored as `timestamptz`.
- Generated column `time_range tstzrange` = `tstzrange(startsAt, endsAt, '[)')` supports exclusion indexing.
- **`encounters.appointmentId`** is unique (0..1 encounter per appointment).
- **`AppointmentParticipant`** deferred; participants are patient + practitioner (+ optional location) on the appointment row for v1.
- Indexes: `(organizationId, startsAt)`, `(organizationId, practitionerId, startsAt)`, `(organizationId, patientId, startsAt)`, `(organizationId, status, startsAt)`.

**Conflicts (implemented — [ADR-010](../adr/ADR-010-appointment-conflict-prevention.md)):**

```sql
EXCLUDE USING gist (
  organizationId WITH =,
  practitionerId WITH =,
  time_range WITH &&
)
WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'));
```

Requires `btree_gist`. Adjacent half-open slots do not overlap. Room exclusion deferred ([Q11](../OPEN_QUESTIONS.md)).

## 4. Rehabilitation and exercises

```mermaid
erDiagram
  Patient ||--o{ RehabilitationPlan : has
  Practitioner ||--o{ RehabilitationPlan : owns
  RehabilitationPlan ||--o{ RehabilitationPlanRevision : versions
  RehabilitationPlan ||--o| RehabilitationPlanRevision : "points to current"
  RehabilitationPlanRevision ||--o{ RehabilitationGoal : contains
  RehabilitationPlanRevision ||--o{ RehabilitationPlanPhase : contains
  RehabilitationPlanRevision ||--o{ ExercisePrescription : contains
  RehabilitationPlanPhase ||--o{ ExercisePrescription : groups
  ExerciseDefinition ||--o{ ExercisePrescription : prescribed_as
  ExerciseDefinition ||--o{ ExerciseMedia : documents
  MeasurementDefinition ||--o{ RehabilitationGoal : measures
  Measurement ||--o{ RehabilitationGoal : baseline_for

  RehabilitationPlan {
    uuid id PK
    uuid organizationId FK
    uuid patientId FK
    uuid responsiblePractitionerId FK
    string status
    uuid currentRevisionId FK
    int version
  }

  RehabilitationPlanRevision {
    uuid id PK
    uuid organizationId FK
    uuid planId FK
    uuid basedOnRevisionId FK
    int revisionNumber
    string status
    string title
    date startDate
    date expectedEndDate
    timestamptz effectiveFrom
  }

  RehabilitationGoal {
    uuid id PK
    uuid organizationId FK
    uuid planRevisionId FK
    uuid measurementDefinitionId FK
    uuid baselineMeasurementId FK
    string anatomicalRegionCode
    string laterality
    string targetOperator
    float targetValue
    float baselineNumericValueSnapshot
    string status
  }

  RehabilitationPlanPhase {
    uuid id PK
    uuid organizationId FK
    uuid planRevisionId FK
    string name
    int displayOrder
  }

  ExerciseDefinition {
    uuid id PK
    uuid organizationId FK
    string code
    string name
    string category
    string[] anatomicalRegionCodes
    string[] targetMuscleGroupCodes
    string[] equipment
    string[] supportedDosageKinds
    boolean active
  }

  ExercisePrescription {
    uuid id PK
    uuid organizationId FK
    uuid planRevisionId FK
    uuid phaseId FK
    uuid exerciseDefinitionId FK
    string exerciseCodeSnapshot
    int repetitions
    int sets
    int durationSeconds
    int holdSeconds
    float distanceMeters
    float loadKg
    string frequencyType
  }
```

Built-in exercise definitions have `organizationId = null`; organization definitions use their own organization. Patient-specific dosage is only on `ExercisePrescription`.

Published revisions are immutable. A plan has at most one DRAFT revision (partial unique index), and `currentRevisionId` always references a published revision after activation. Goal baseline snapshots preserve historical meaning while the optional Measurement foreign key retains provenance.

## 5. Assessments and measurements — Phase 5 core

```mermaid
erDiagram
  Patient ||--o{ Assessment : has
  Encounter ||--o{ Assessment : "optional context"
  MeasurementDefinition ||--o{ AssessmentTemplateItem : configures
  AssessmentTemplate ||--o{ AssessmentTemplateItem : contains
  AssessmentTemplate ||--o{ Assessment : instantiates
  Assessment ||--o{ Measurement : contains
  MeasurementDefinition ||--o{ Measurement : defines

  Measurement {
    uuid id PK
    uuid organizationId FK
    uuid patientId FK
    uuid assessmentId FK
    uuid definitionId FK
    uuid templateItemId FK
    string definitionCodeSnapshot
    string valueTypeSnapshot
    float numericValue
    string textValue
    boolean booleanValue
    string codedValue
    string unitCodeSnapshot
    string anatomicalRegionCode
    string laterality
    int sequenceNumber
    timestamptz performedAt
  }
```

Exactly one value representation is populated and must match the definition type. Templates are immutable revisions; measurements snapshot definition meaning. `anatomicalRegionCode` is a canonical bridge to future `AnatomicalStructure`, not a mesh ID. Completed assessments are immutable and corrections use void-and-recreate in Phase 5.

## 6. Anatomy and annotations

```mermaid
erDiagram
  AnatomicalModel ||--o{ AnatomicalModelVersion : versions
  AnatomicalModelVersion ||--o{ AnatomicalModelStructureMapping : maps
  AnatomicalStructure ||--o{ AnatomicalStructure : parent
  AnatomicalStructure ||--o{ AnatomicalModelStructureMapping : canonicalizes
  Patient ||--o{ BodyAnnotation : has
  Encounter ||--o{ BodyAnnotation : "optional"
  AnatomicalModelVersion ||--o{ BodyAnnotation : "recorded against"
  AnatomicalStructure ||--o{ BodyAnnotation : "on"
  AnatomicalModelStructureMapping ||--o{ BodyAnnotation : anchors
  BodyAnnotation ||--o{ BodyAnnotationStatusHistory : history

  AnatomicalModel {
    uuid id PK
    string name
    string code
    string kind
  }

  AnatomicalModelVersion {
    uuid id PK
    uuid modelId FK
    int version
    string storageKey
    string checksumSha256
    string status
    float transform
  }

  AnatomicalStructure {
    uuid id PK
    string code
    string name
    string category
    string laterality
    string regionCode
    uuid parentId FK
  }

  AnatomicalModelStructureMapping {
    uuid id PK
    uuid modelVersionId FK
    uuid structureId FK
    string stableMeshKey
    int primitiveIndex
    string confidence
  }

  BodyAnnotation {
    uuid id PK
    uuid organizationId FK
    uuid patientId FK
    uuid encounterId FK
    uuid modelVersionId FK
    uuid structureId FK
    uuid mappingId FK
    string type
    int severity
    string status
    int triangleIndex
    float barycentricUVW
    float localPositionXYZ
    int version
    timestamptz createdAt
  }

  BodyAnnotationStatusHistory {
    uuid id PK
    uuid organizationId FK
    uuid annotationId FK
    string fromStatus
    string toStatus
    uuid changedByUserId FK
    timestamptz changedAt
  }
```

Model/version/structure/mapping rows contain **no PHI**. Annotations and status history always include `organizationId`; every query is organization-scoped.

Incompatible model upgrades **do not** silently remap old `surfaceReference` values (ADR-004).

## 7. Notes, files, audit

```mermaid
erDiagram
  Patient ||--o{ ClinicalNote : has
  ClinicalNote ||--o{ ClinicalNoteRevision : history
  Patient ||--o{ Document : has
  Document ||--o{ Attachment : files
  Organization ||--o{ AuditEvent : scoped

  ClinicalNote {
    uuid id PK
    uuid organizationId FK
    uuid patientId FK
    uuid encounterId FK
    string kind
    int version
  }

  Document {
    uuid id PK
    uuid organizationId FK
    uuid patientId FK
    string title
    string classification
  }

  Attachment {
    uuid id PK
    uuid documentId FK
    string storageKey
    string mimeType
    int sizeBytes
    string checksum
  }

  AuditEvent {
    uuid id PK
    uuid organizationId FK
    uuid actorUserId FK
    string action
    string entityType
    uuid entityId
    uuid requestId
    jsonb metadata
    timestamptz occurredAt
  }
```

**Phase 3:** patient mutations use generic append-oriented `AuditEvent` (section 2) committed **in the same transaction** as the Patient write. Metadata is controlled (`changedFields`, status transitions) — not full PHI replicas. No update/delete APIs exist for staff. Indexes include `(organizationId, entityType, entityId, occurredAt)` and `(organizationId, actorUserId, occurredAt)`.

## 8. Clinical report export

```mermaid
erDiagram
  Organization ||--o{ ClinicalReport : scopes
  Patient ||--o{ ClinicalReport : has
  Practitioner ||--o{ ClinicalReport : generates
  User ||--o{ ClinicalReport : authors_or_voids

  ClinicalReport {
    uuid id PK
    uuid organizationId FK
    uuid patientId FK
    string type
    string status
    timestamptz periodFrom
    timestamptz periodTo
    jsonb configuration
    jsonb sourceSnapshotMetadata
    string storageKey
    string templateVersion
    timestamptz generatedAt
    timestamptz voidedAt
  }
```

There is no progress-score table. Timeline and progress endpoints are derived projections over existing records.

## 9. Indexing philosophy

Add indexes from **real query paths**, not preemptively on every FK. Anticipated:

- Patient list / admin search: `(organizationId, status, lastName, firstName, id)`; phone/email as above. Caveat: Ukrainian case/variant folding may need generated columns or ICU later.
- Calendar: `(organizationId, practitionerId, startsAt)`
- Annotations: `(patientId, createdAt)`, `(patientId, anatomicalStructureId)`

List API uses **offset pagination** (page/pageSize) for Phase 3 — documented in patient-crm.md.

## 10. Soft delete policy

| Entity | Default |
| --- | --- |
| Patient | Status `INACTIVE` / `COMPLETED` / `ARCHIVED` |
| ClinicalNote, Assessment, BodyAnnotation | Correct via revision / supersede; no casual delete |
| Appointment | Status `CANCELLED` |
| Exercise (catalogue) | `active = false` |
| User | `DISABLED` |
| AuditEvent | Never delete via application |
| Attachment | Retention job + legal hold (future) |
