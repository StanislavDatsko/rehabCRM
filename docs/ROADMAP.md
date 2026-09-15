# RehabCRM roadmap

## Phase 6 — Rehabilitation Plans + Goals + Exercise Library

Versioned specialist-authored plans, structured goals linked to Phase 5 measurements, clinician-defined phases, reusable exercise definitions, typed patient prescriptions, lifecycle commands, and revision history.

The next recommended vertical slice is **3D Anatomy + Anatomical Structures + Patient Body Annotations**.

## Phase 5 — structured assessments and measurements

Assessment lifecycle, typed observations, immutable template revisions, organization-scoped clinical access, longitudinal history, and specialist workspace are implemented in this phase. Custom template management, validated protocol claims, formal amendment workflows, and clinical interpretation are excluded.

Phased delivery. Do not start a later phase until the previous phase meets Definition of Done (authorization, tests, states, docs where architecture changed).

## Phase 0 — Architecture

Documentation and ADRs.

## Phase 1 — Foundation

Monorepo (pnpm + Turborepo), Next.js, NestJS, Docker Compose (PostgreSQL, Redis, MinIO, Keycloak), Prisma, lint, format, strict TS, tests, CI, env validation, health, OpenAPI, structured logging.

**Exit:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` succeed.

## Phase 2 — Identity + organization — implemented (foundation)

OIDC BFF (Auth.js + Keycloak realm import), JWT/JWKS resource server, User + membership + permissions, deny-by-default guards, `/api/v1/me`, staff login shell, org-scoped authorization tests.

**Not done in this phase:** Patients, appointments, clinical notes product, 3D.

Temporary Phase 2 `AuthorizationProbe` fixture is **retired** in Phase 3 in favor of real Patient org-isolation tests.

## Phase 3 — Patient CRM — implemented (administrative core)

Staff administrative patient list, create, search, profile, status lifecycle, responsible practitioner, optimistic concurrency, transactional mutation audit, admin vs future clinical projections (admin only now). Polished specialist-first UX.

Docs: [patient-crm.md](./architecture/patient-crm.md), [ADR-008](./adr/ADR-008-patient-concurrency.md), [ADR-009](./adr/ADR-009-clinical-vs-administrative-projections.md).

**Not in this phase:** rehabilitation plans, clinical notes, assessments, appointments, 3D, patient auth.

**Verification note:** unit tests and production builds pass. Database migration, seeded UI workflow, and browser E2E remain to be executed when Docker is available.

## Phase 4 — Appointments — implemented (scheduling core)

Calendar API, practitioner conflict prevention (PostgreSQL exclusion), appointment status workflow, encounter start/complete distinct from booking, org/location timezone display contract, patient schedulability policy, command-style POST endpoints, optimistic concurrency on appointments.

Docs: [scheduling.md](./architecture/scheduling.md), [encounters.md](./architecture/encounters.md), [ADR-010](./adr/ADR-010-appointment-conflict-prevention.md).

**Not in this phase:** recurring appointments, SMS/email notifications, room-level conflict enforcement, walk-in encounter without appointment, specialist-only calendar read filter, production calendar UI (nav stub only).

**Verification note:** unit tests and production builds pass. Database migration, seeded scheduling workflow, and browser E2E remain to be executed when Docker is available.

## Phase 5 — Structured assessments and measurements — implemented

Typed clinical observations, stable definitions, immutable template revisions, assessment lifecycle, longitudinal history, specialist-only BFF UI, optimistic concurrency, and transactional audit. No automatic diagnosis or clinical interpretation.

## Phase 7 — 3D anatomy

Implemented: inspected/versioned muscular, skeletal, and joint assets; canonical structures and reviewed mappings; precise persisted surface anchors; specialist-only body annotations with history/audit; lazy multi-layer body map; derived heatmap; measurement/goal/prescription context; patient and encounter integration.

Production activation remains gated on Z-Anatomy license review, broader anatomy mapping review, live migration/seed/import, visual layer verification, and browser E2E.

The next recommended vertical slice is **Longitudinal Progress Analytics + Clinical Timeline + Reports**.

## Phase 8 — Longitudinal Progress Analytics + Clinical Timeline + Reports — implemented

Bounded specialist-only progress projections, curated clinical timeline, comparable measurement series, informational goal-target checks, domain-aware plan revision history, longitudinal body-annotation summaries, and immutable server-generated clinical PDFs in private object storage.

Infrastructure verification remains outstanding: the migration, seed, S3 upload/signed download, and browser E2E were not run because local Docker services were unavailable.

The next recommended vertical slice is **Production Hardening + Staff Administration + Deployment Readiness**.

## Phase 9 — Production hardening and staff administration — implemented, live gates blocked

Implemented: organization-admin staff list/profile/provisioning/role/access/session workflows; least-privilege Keycloak adapter with no CRM passwords; serialized last-admin invariant; production fail-fast configuration; CSP/headers/CORS/body/rate-limit hardening; release health, safe metrics, trace context, and error-tracker boundary; encrypted backup/restore tooling; non-root images and deployment reference; CI secret/dependency/image/SBOM/migration jobs; Playwright/axe browser matrix; k6 smoke/concurrency foundations; ASVS and operations runbooks.

**NOT YET PILOT READY.** The Docker daemon was unavailable, so real-stack migrations, production OIDC, browser E2E, container scans, backup recovery, alerts, accessibility, performance, concurrency, rollback, and disaster-recovery evidence remain blocked. See [production readiness](./operations/production-readiness.md) and [verification evidence](./operations/verification-2026-09-04.md). No real patient data may be used until every mandatory gate passes.

## Phase 10 — Patient Monitoring — implementation complete, final audit pending

Daily patient reports, bounded symptom projections, exercise completion records, provenance-preserving clinician review, patient progress integration, deterministic seed data, and self-only authorization are implemented. Notifications, reminders, alerts, email, push, and SMS remain explicitly out of scope.

Docs: [patient-monitoring.md](./architecture/patient-monitoring.md).

## Phase 11 — Notifications + Clinician Alerts — implementation complete, final audit pending

Recipient-scoped in-app notifications, deterministic clinician attention alerts, deduplication, acknowledge/resolve lifecycle, optimistic concurrency, audit traceability, and neutral non-diagnostic wording are implemented. Email, SMS, push, Web Push, ML triage, diagnosis, and emergency escalation remain out of scope.

Docs: [notifications-alerts.md](./architecture/notifications-alerts.md).

Patient portal, patient auth, patient mobile app, FHIR server, Elasticsearch, microservices split, SaaS billing.

## Explicitly not on the roadmap

## Phase 12 — Secure patient media — implementation complete, final audit pending

Private organization- and patient-scoped rehabilitation photos/videos are stored as metadata in PostgreSQL and originals in MinIO/S3. Specialist-only permissions, direct presigned uploads, configurable per-file limits, bounded gallery pagination, signed inline access, voiding, and audit traceability are implemented. No patient media portal, transcoding, or thumbnails are included.

After this phase, RehabMIS functional scope is frozen. Further work is limited to bug fixes, thesis artifacts, diagrams, screenshots, demo preparation, final verification, and production-readiness cleanup.
