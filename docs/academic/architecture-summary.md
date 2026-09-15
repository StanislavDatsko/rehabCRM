# RehabMIS architecture summary

RehabMIS is a modular monolith with a Next.js web application, NestJS API, PostgreSQL database accessed through Prisma, and external infrastructure for identity, caching, private files, and 3D assets.

- **Next.js** renders the staff and patient BFF surfaces, server actions, navigation, safe projections, and forms.
- **NestJS** owns authentication, permission checks, domain commands, validation, transactions, audit, and API projections.
- **PostgreSQL / Prisma** store the authoritative organization, identity membership, patient, clinical, planning, monitoring, notification, alert, and audit data. Relational constraints and migrations protect consistency.
- **Keycloak** authenticates staff and patients through OIDC. It does not replace application authorization.
- **Redis** supports infrastructure concerns such as rate limiting and operational coordination.
- **MinIO/S3** stores private clinical documents and anatomy assets; the API returns expiring signed URLs.
- **Three.js** renders the versioned 3D anatomy/body-map experience in the browser.

The main data flow is: authenticated OIDC identity → BFF/API token verification → active PostgreSQL membership and permission bundle → organization- and resource-scoped domain query → explicit UI projection. Patient monitoring flows derive the patient from `User → OrganizationMembership → PatientPortalAccount → Patient`; clinicians review the resulting time series and source records. Deterministic notification/alert generation records recipient, patient, rule type, and source identifiers, while audit events record state-changing actions without sensitive prose.

## Database model index

The authoritative model is `apps/api/prisma/schema.prisma`. Its thesis-relevant aggregates are: `Organization`, `User`, `OrganizationMembership`, `Patient`, `PatientPortalAccount`, `Practitioner`; `Appointment`, `Encounter`; `Assessment`, `Measurement`, `MeasurementDefinition`; `RehabilitationPlan`, `RehabilitationPlanRevision`, `Goal`, `ExerciseDefinition`, `ExercisePrescription`, `ExerciseCompletion`; `DailyReport`; `Notification`, `ClinicalAlert`; `BodyAnnotation`; `ClinicalReport`; and `AuditEvent`. The existing [ERD](../architecture/erd.md) remains the single diagram reference.
