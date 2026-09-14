# Assessments (Phase 5)

An `Assessment` is a specialist-performed evaluation. It groups structured `Measurement` observations; it is not a diagnosis, treatment recommendation, or replacement for an `Encounter`.

## Ownership and workflow

```text
Patient 1 ──* Assessment *──0..1 Encounter
Practitioner 1 ──* Assessment
AssessmentTemplate 1 ──* Assessment
Assessment 1 ──* Measurement
```

An assessment normally starts from an encounter, but `encounterId` is nullable to support imported or manually entered historical assessments. When present, organization and patient must match the encounter; the current phase also requires its practitioner to match the authenticated practitioner's profile. The server derives `organizationId`, actor IDs, and `practitionerId`; the browser cannot choose a practitioner.

Authorized rehabilitation specialists can access clinical assessments for all patients in their organization. Assignment-based restrictions are a future policy boundary, not an implicit Phase 5 rule. Receptionists and organization administrators do not receive assessment payloads.

## State machine and history

```text
DRAFT ──complete──> COMPLETED ──void(reason)──> VOIDED
  └────────────────void(reason)───────────────> VOIDED
```

- Drafts accept partial, version-checked saves.
- Completion atomically validates required template items and every value, changes status, and writes an audit event.
- Completed and voided assessments reject normal edits.
- Voiding preserves the assessment and measurements and requires a reason.
- Phase 5 corrections use **void + create corrected assessment**. An amendment/revision workflow remains open.
- Assessment completion does not complete its encounter.

The integer `version` is checked on every draft save and state command. A stale write returns `409 ASSESSMENT_UPDATE_CONFLICT`.

## Template stability

Templates are immutable revisions identified by stable `code` plus `revision`. The read API exposes only active, visible revisions (system templates have `organizationId = null`; custom templates belong to one organization). No template-management UI exists in Phase 5.

Completed assessments retain their exact template revision. Each measurement additionally snapshots the definition code, name, category, value type, unit, and configured range. A future display-name or template revision therefore cannot silently reinterpret historical data. See [ADR-011](../adr/ADR-011-structured-clinical-measurements.md).

## API and permissions

| Endpoint | Permission |
| --- | --- |
| `GET /api/v1/patients/:patientId/assessments` | `assessment.read` |
| `POST /api/v1/patients/:patientId/assessments` | `assessment.create` |
| `GET /api/v1/assessments/:id` | `assessment.read` + `measurement.read` |
| `PATCH /api/v1/assessments/:id` | `assessment.update` + `measurement.write` |
| `POST /api/v1/assessments/:id/complete` | `assessment.complete` |
| `POST /api/v1/assessments/:id/void` | `assessment.void` |
| `GET /api/v1/patients/:patientId/measurements/history` | `measurement.read` |
| `GET /api/v1/assessment-templates[/:id]` | `assessment_template.read` |

Every lookup is organization-scoped. Guessed cross-organization patient, encounter, assessment, or template UUIDs are concealed as `404`.

## Audit and privacy

Persisted changes use `ASSESSMENT_CREATED`, `ASSESSMENT_UPDATED`, `ASSESSMENT_MEASUREMENTS_UPDATED`, `ASSESSMENT_COMPLETED`, and `ASSESSMENT_VOIDED`. Audit metadata may contain IDs, status transitions, and changed definition codes, but never measurement values, notes, or the professional summary. Assessment mutation, measurements, and audit event share one transaction.

