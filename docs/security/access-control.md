# Access control

Authorization is enforced in **`apps/api`**. Frontend checks are UX only.

## 1. Principles

- Deny by default.
- Least privilege.
- Organization isolation on every PHI query.
- Client `organizationId` is ignored except as a hint that must match the session org (or an admin's explicitly selected, server-validated org).
- Resource checks: membership + permission + (where required) care relationship.
- Receptionist **does not** inherit clinical-read permissions.
- Cross-organization resource access uses scoped queries (`id` + `organizationId`) and returns **404** (conceal existence).

## 2. v1 roles

| Role | Intent |
| --- | --- |
| `SYSTEM_ADMIN` | Platform operations plus organization-scoped clinical and administration permissions. |
| `ORGANIZATION_ADMIN` | Staff, locations, org settings, user disable and clinical permissions. |
| `REHABILITATION_SPECIALIST` | Primary clinical user: plans, notes, assessments, anatomy annotations. |

Future roles (`DOCTOR`, `PHYSICAL_THERAPIST`, `OCCUPATIONAL_THERAPIST`, `AUDITOR`) are **not** implemented until a workflow needs them. Prefer new **permissions** over new roles.

There is **no** `PATIENT` role.

## 3. Permission catalog (v1)

Permissions are strings. Roles are bundles. Users may later receive extra grants; v1 may map 1:1 role → bundle.

| Permission | Receptionist | Specialist | Org admin | System admin |
| --- | --- | --- | --- | --- |
| `patient.read.admin` (identity, contact, responsible specialist, admin status) | Allow | Allow | Allow | Break-glass only* |
| `patient.read.clinical` (future clinical projection — not Phase 3 data) | Deny | Allow | Deny | Deny* |
| `patient.create` | Allow | Allow | Allow | Deny* |
| `patient.update.admin` | Allow | Allow | Allow | Deny* |
| `patient.change_status` | Allow | Allow | Allow | Deny* |
| `appointment.read` | Allow | Allow | Allow | Deny* |
| `appointment.create` | Allow | Allow | Allow | Deny* |
| `appointment.update` | Allow | Allow | Allow | Deny* |
| `appointment.cancel` | Allow | Allow | Allow | Deny* |
| `appointment.change_status` | Allow | Allow | Allow | Deny* |
| `encounter.read` | Deny | Allow | Allow | Deny* |
| `encounter.start` | Deny | Allow | Deny | Deny* |
| `encounter.complete` | Deny | Allow | Deny | Deny* |
| `clinical_note.read` | Deny | Allow | Deny | Deny* |
| `clinical_note.write` | Deny | Allow | Deny | Deny* |
| `rehabilitation_plan.read` | Deny | Allow | Deny | Deny* |
| `rehabilitation_plan.create` | Deny | Allow | Deny | Deny* |
| `rehabilitation_plan.update` | Deny | Allow | Deny | Deny* |
| `rehabilitation_plan.activate` | Deny | Allow** | Deny | Deny* |
| `rehabilitation_plan.pause` | Deny | Allow | Deny | Deny* |
| `rehabilitation_plan.complete` | Deny | Allow | Deny | Deny* |
| `rehabilitation_plan.cancel` | Deny | Allow | Deny | Deny* |
| `rehabilitation_goal.read` | Deny | Allow | Deny | Deny* |
| `rehabilitation_goal.write` | Deny | Allow | Deny | Deny* |
| `exercise_prescription.read` | Deny | Allow | Deny | Deny* |
| `exercise_prescription.write` | Deny | Allow | Deny | Deny* |
| `assessment.read` | Deny | Allow | Deny | Deny* |
| `assessment.create` | Deny | Allow | Deny | Deny* |
| `assessment.update` | Deny | Allow | Deny | Deny* |
| `assessment.complete` | Deny | Allow | Deny | Deny* |
| `assessment.void` | Deny | Allow | Deny | Deny* |
| `measurement.read` | Deny | Allow | Deny | Deny* |
| `measurement.write` | Deny | Allow | Deny | Deny* |
| `assessment_template.read` | Deny | Allow | Deny | Deny* |
| `exercise.read` | Allow | Allow | Allow | Allow |
| `exercise.manage` | Deny | Deny | Deny | Deny* |
| `anatomy.read` / `anatomy_model.read` | Deny | Allow | Deny | Allow (non-PHI model metadata only) |
| `anatomy_model.manage` | Deny | Deny | Deny | Allow |
| `body_annotation.read` | Deny | Allow | Deny | Deny* |
| `body_annotation.create/update/resolve/void` | Deny | Allow | Deny | Deny* |
| `progress.read` | Deny | Allow | Deny | Deny* |
| `clinical_timeline.read` | Deny | Allow | Deny | Deny* |
| `clinical_report.read/create/void` | Deny | Allow | Deny | Deny* |
| `document.read.admin` | Allow*** | Allow | Allow | Deny* |
| `document.read.clinical` | Deny | Allow | Deny | Deny* |
| `document.write` | Allow*** | Allow | Allow | Deny* |
| `audit.read` | Deny | Deny | Allow (org) | Allow (ops) |
| `staff.read` | Allow | Allow | Allow | Allow |
| `staff.manage` | Deny | Deny | Allow | Allow |
| `org.settings.write` | Deny | Deny | Allow | Allow |

\* System admin default is **operations without PHI**. Break-glass patient access, if ever allowed, must be a separate permission, time-bounded, and heavily audited (`docs/OPEN_QUESTIONS.md`).

\*\* v1: specialist who owns the plan may activate it; no separate medical director workflow unless required.

\*\*\* Receptionist documents: administrative uploads only (ID scans, referrals classified administrative). Classification is a required field; clinical classification requires `document.read.clinical`.

`patient.change_status` covers transitions including `ARCHIVED`. Tightening “who may archive” to org-admin-only remains a product option; current Phase 3 default allows roles that hold the permission.

## 4. Resource-level rules

**Patient**

- Row must match session `organizationId` (404 if not).
- Responsible practitioner assignment: same organization + ACTIVE practitioner.
- `patient.read.clinical` and write of clinical artifacts additionally require one of:
  - user is `responsiblePractitioner` for the patient, or
  - user is a `REHABILITATION_SPECIALIST` with an **active care relationship** (encounter in last N days, or explicit assignment — **N and assignment model are open questions**; safest v1: any specialist in the **same organization** with `patient.read.clinical`, tightened later).

Until care-relationship is implemented, **document the temporary rule**: org + role permission. Tightening before production patient data (Q5).

**Appointment**

- Same org on every lookup; cross-org UUID → **404**.
- `patient.organizationId`, `practitioner.organizationId`, and `appointment.organizationId` must match.
- New bookings: patient schedulable (`ACTIVE` or `INACTIVE` only); practitioner must be `ACTIVE`.
- Receptionist and org admin: full appointment workflow (create, update, cancel, confirm, check-in, no-show).
- Specialist: `appointment.read` only — no create/cancel/status commands in v1.
- **Practitioner calendar scoping (future):** Phase 4 returns org-wide calendar for principals with `appointment.read`. Tightening so specialists see only their own `practitionerId` by default is planned; receptionist/org admin retain org-wide views. See [scheduling.md](../architecture/scheduling.md).

**Encounter**

- Same org; cross-org → **404**.
- Start (`encounter.start`): rehabilitation specialist only — creates encounter and moves linked appointment to `IN_PROGRESS`.
- Complete (`encounter.complete`): rehabilitation specialist only.
- Org admin: `encounter.read` for oversight; cannot start or complete visits.
- Receptionist: no encounter permissions (cannot read or mutate by UUID guessing).

**ClinicalNote, Assessment, BodyAnnotation**

- Require corresponding `*.read` / `*.write` **and** patient clinical access. Receptionist tokens must fail even if they guess UUIDs (authorization tests).

Body-map routes require `anatomy.read`, `anatomy_model.read`, and `body_annotation.read`. Annotation commands use distinct create/update/resolve/void permissions. Model metadata is non-PHI; patient annotations are always organization-scoped and cross-organization IDs are concealed as 404.

Phase 5 splits assessment capabilities into `assessment.read`, `.create`, `.update`, `.complete`, `.void`, `measurement.read`, `measurement.write`, and read-only `assessment_template.read`. Only `REHABILITATION_SPECIALIST` receives them. Creation additionally resolves an active `Practitioner` from the authenticated user; no request DTO accepts `practitionerId`. The temporary access policy is organization-wide for authorized specialists, with an explicit boundary for later assignment-based policy. All cross-organization patient, encounter, assessment, template, and measurement-history lookups return `404`.

**Rehabilitation plans, goals, and prescriptions**

- Reading the full projection requires plan, goal, and prescription read permissions. Receptionists, organization admins, and system admins receive none of these clinical permissions.
- Creation resolves the responsible Practitioner from the authenticated specialist; request bodies cannot select or impersonate another practitioner.
- Every plan lookup is scoped by the session organization. Patient, baseline Measurement, MeasurementDefinition, and organization-specific ExerciseDefinition references are validated server-side. Cross-organization identifiers are concealed as `404`.
- An ACTIVE or PAUSED plan's published revision is immutable. Editing requires a copied DRAFT revision and publishing atomically advances the current pointer.
- Compare-and-swap on plan `version` prevents stale aggregate saves and lifecycle commands; mismatch returns `409 REHABILITATION_PLAN_UPDATE_CONFLICT`.
- `exercise.read` exposes reusable, patient-free catalogue data. Phase 6 has no management endpoint; shared definitions are not editable through the application.

**Progress, timeline, and clinical reports**

- These routes require their exact specialist-only permission and bind every query/report lookup to the principal organization.
- Receptionists, organization admins, and system admins cannot read progress or report metadata/files by UUID.
- Report authorship is resolved from the authenticated active practitioner; forms cannot nominate another author or storage key.
- Completed download URLs expire after five minutes. Create, generate, download, and void actions are audited without report prose.

**Patient monitoring**

- Patient self-service monitoring permissions are separate from clinical measurement and plan permissions. The server resolves `patientId`, `organizationId`, portal account, and active membership from the authenticated context; ownership fields are rejected by strict DTOs.
- Daily reports and exercise completions are bounded, versioned, audited, and marked `PATIENT_REPORTED`. Exercise completions reference the active plan revision and never mutate prescriptions.
- Clinician review requires `patient_monitoring.read`. Receptionists, organization administrators, system administrators, and patients do not receive this permission. Staff projections are organization-scoped and conceal foreign patients as `404`.

**Notifications and clinician alerts**

- In-app notifications are recipient-owned: every list, count, read, and dismiss query binds both `organizationId` and authenticated `recipientUserId`; foreign IDs return `404`.
- Patient notification routes expose only the patient’s own notifications. Clinician alert routes require `clinical_alert.read` and additionally bind alerts to the responsible practitioner; patients and non-clinical staff cannot access them.
- Alert acknowledge/resolve commands require the matching lifecycle permission and a current `version`; stale writes return `409` and state changes are audited without storing notification or symptom prose in audit metadata.
- Alert generation is deterministic and deduplicated by patient, rule type, and source record. Messages are neutral attention signals, not diagnoses or emergency instructions. Email, SMS, push, Web Push, ML triage, and emergency escalation are not implemented.

**Patient media**

- `patient_media.read/create/void/download` are explicit clinical permissions granted only to rehabilitation specialists. Patients, receptionists, organization administrators, and system administrators do not receive them by default.
- Every media operation binds organization and patient IDs server-side. Optional encounter, assessment, and rehabilitation-plan associations must belong to the same patient and organization; foreign records are concealed as `404`.
- Uploads use a pending metadata record and a short-lived presigned PUT to private MinIO/S3. The API never buffers large video bodies. Finalization checks object size and MIME metadata before making a record ready; downloads require a fresh authorization check and a short-lived signed GET URL.
- Original filenames are sanitized display metadata only. Opaque object keys prevent path traversal and authorization by filename. Clinical media is voided in metadata rather than deleted through the normal UI, and upload/finalize/void actions are audited without descriptions or media content.

## 5. Field-level projection

Do not return Prisma records. Explicit DTOs ([ADR-009](../adr/ADR-009-clinical-vs-administrative-projections.md)):

- `PatientAdministrativeResponse` — receptionist-safe Phase 3 projection
- Future `PatientClinicalResponse` (or equivalent) — clinical fields only when modules exist

API must not leak clinical fields on admin endpoints when those columns/joins appear later.

## 6. Implementation notes

- Global `AuthenticationGuard` + `PermissionsGuard` (deny by default). `@Public()` is required for anonymous routes.
- Permissions come from the membership **role bundle** in PostgreSQL, not from JWT claims.
- Cross-organization reads use `findFirst({ id, organizationId })` → **404**.
- Phase 3 Patient APIs are the authoritative org-scoped authorization surface. The Phase 2 `AuthorizationProbe` fixture is **retired** — isolation tests target Patient instead of a production probe table.
- Optimistic concurrency on Patient updates: version mismatch → **409** ([ADR-008](../adr/ADR-008-patient-concurrency.md)).
