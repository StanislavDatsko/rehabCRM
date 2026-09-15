# RehabMIS system capabilities

## Electronic patient record

The patient record combines administrative identity, appointments, encounters, structured assessments and measurements, rehabilitation plans, goals, monitoring data, body annotations, progress, timeline, and generated clinical reports. It is an application-level electronic clinical record, not a certified national EHR.

## Rehabilitation planning

Specialists create patient-specific plans with immutable published revisions, phases, goals, exercise prescriptions, dosage, frequency, laterality, instructions, and lifecycle states. Shared exercise definitions are templates; personalization lives in each patient’s prescription and plan revision.

## Patient monitoring and execution

Patients submit daily reports and exercise completions through a separate self-service portal. Records preserve patient-reported provenance, validation, versioning, and audit history. Completion records do not mutate clinician-authored prescriptions.

## Progress analytics

Bounded time-series projections visualize entered measurements, including pain, ROM flexion/extension, strength, timed-up-and-go, and walk distance. This is automated processing and visualization of structured entered measurements, not automatic hardware collection.

## Notifications and alerts

Patients receive relevant plan/action notifications. Responsible clinicians receive recipient-scoped in-app notifications and deterministic attention alerts for defined monitoring conditions. Alerts are traceable, deduplicated, acknowledgeable/resolvable, neutral, and non-diagnostic.

## Secure patient media

Rehabilitation specialists can attach an effectively unlimited number of photos and videos to a patient record. PostgreSQL stores metadata while private MinIO/S3 stores immutable originals. Direct presigned uploads prevent large videos from being buffered by the API; bounded pagination and five-minute signed inline URLs support scalable gallery viewing. Media is organization/patient scoped, audited, and voided rather than deleted through the normal UI.

## Scheduling and encounters

Appointments provide conflict-aware scheduling and lifecycle commands; encounters distinguish starting and completing a visit.

## 3D anatomy and reports

Versioned anatomy assets and body annotations connect anatomical context to patient records. Clinical progress reports are generated as immutable PDFs in private object storage with short-lived signed downloads.

## Security, access control, and administration

Keycloak authenticates identities; PostgreSQL memberships supply business roles and permissions. NestJS guards deny by default, every clinical lookup is organization-scoped, patient identity is server-derived, and administrative access is not automatically clinical access. Organization administrators manage staff provisioning and status without application-managed staff passwords.
