# FHIR mapping (future)

RehabCRM does **not** implement HL7 FHIR in v1. This document records an **approximate** mapping so internal names stay mappable later. Do not force FHIR resource shapes into the first schema.

Jurisdiction, profiles (e.g. US Core vs national IG), and FHIR version (R4 vs R5) are undecided — see [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md).

| Internal entity | Approximate FHIR resource | Notes |
| --- | --- | --- |
| Organization | Organization | Type: rehab clinic / facility |
| Location | Location | Site / room |
| User | — | Staff identity is IdP; not a FHIR Patient |
| Practitioner | Practitioner + PractitionerRole | Role is org-scoped |
| Patient | Patient | **No** `Patient.identifier` for login. Staff-managed demographics only |
| PatientContact / EmergencyContact | Patient.contact | |
| Consent | Consent | Purpose and period must be modeled carefully |
| Appointment | Appointment | Participants: patient + practitioner + location |
| AppointmentParticipant | Appointment.participant | |
| Encounter | Encounter | Distinct from Appointment |
| RehabilitationPlan / published revision | CarePlan | Conceptual mapping only; internal revisions and lifecycle require profile-specific mapping |
| RehabilitationGoal | Goal | Measurement-linked targets may reference Observation semantics; specialist status remains authoritative |
| RehabilitationPhase | CarePlan.activity or nested CarePlan | Prefer activity; avoid over-nesting |
| Exercise (catalogue) | ActivityDefinition or PlanDefinition | Catalogue, not an order |
| ExercisePrescription | CarePlan.activity / ServiceRequest | Future integration choice; patient-specific dosage remains distinct from reusable definition |
| ExerciseSession / Result | Procedure and/or Observation | Staff-recorded; not patient-reported in this product |
| AssessmentTemplate | Questionnaire or ObservationDefinition | |
| Measurement | Observation | Conceptual only: definition code, value, unit, body site, laterality, and performed time map naturally; canonical internal unit codes are not yet a claim of UCUM conformance |
| Assessment | grouped Observations and possibly DiagnosticReport-like workflow | Choice depends on future profile/integration; an assessment is not automatically a diagnosis or a FHIR DiagnosticReport |
| ClinicalNote | DocumentReference and/or Composition | Revision history is extra-FHIR |
| AnatomicalModel | — / Device or Binary later | Asset metadata; not a patient resource |
| AnatomicalStructure | BodyStructure / Anatomy codes (SNOMED) | Canonical keys should map to codes later |
| BodyAnnotation | Observation (body site + component) or Condition **only if** clinically classified — **v1 annotations are observations, not diagnoses** | Do not auto-map PAIN markers to Condition |
| HeatmapEntry | — | Derived view; not a FHIR resource |
| Document / Attachment | DocumentReference + Binary / Attachment | Binary stays in object storage |
| ClinicalReport | DocumentReference + Binary | Immutable PDF snapshot; not a FHIR document bundle |
| AuditEvent | AuditEvent | Align action/outcome codes later |
| Notification | — | Not FHIR |

## Mapping rules of thumb

1. Keep **internal IDs as UUIDs**; FHIR identifiers can be added as a side table later.
2. Prefer **coded measurements** (`code`, `unit`) over narrative-only fields.
3. Do not encode FHIR JSON in PostgreSQL as the system of record.
4. Anatomy `canonicalName` (e.g. `shoulder.left`) should eventually bind to SNOMED/BodyStructure without renaming patient annotations.
5. Never emit FHIR Condition from heatmap severity.
6. Phase 8 progress series approximate `Observation` searches grouped by code/bodySite/laterality; goal projections approximate `Goal`; and plan revisions approximate `CarePlan`. Source snapshot metadata is internal and is not exported as FHIR.

## Explicit non-goals (v1)

- FHIR server (`/fhir`)
- SMART on FHIR
- Bulk export
- C-CDA
