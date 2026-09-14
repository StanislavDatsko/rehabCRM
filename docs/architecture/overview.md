# RehabCRM — Architecture Overview

**Product:** staff-only CRM and rehabilitation management platform for physical rehabilitation centers, including interactive 3D anatomical visualization.

**Status:** Phase 0 / Phase 1 foundation. No patient data may be stored in production until Phase 8 hardening and a legal/security review are complete.

## 1. Product boundary

RehabCRM is an **internal B2B tool**. Users are rehabilitation-center staff. A `Patient` is a **managed domain record**, not an authenticated principal.

Out of scope for this product:

- patient login, accounts, roles, dashboards, or portals
- patient self-service (appointments, documents, exercise tracking)
- automated diagnosis or treatment prescription
- full HL7 FHIR implementation
- multi-tenant SaaS billing / self-service signup

A future patient-facing product, if ever required, is a **separate bounded context**, not an extension of the staff `User` model.

## 2. Style

**Modular monolith** with explicit domain modules, deployed as:

| App | Role |
| --- | --- |
| `apps/api` | NestJS — authoritative business rules, authorization, persistence, audit |
| `apps/web` | Next.js (App Router) — staff UI, BFF session cookie, no security-critical authorization |

Shared packages hold **contracts, config, UI primitives, and toolchain config**. Domain rules stay in the API.

## 3. Runtime topology (local / production-shaped)

```text
Staff browser
    │  HTTPS
    ▼
apps/web (Next.js)
    │  httpOnly session cookie (BFF)
    │  server-side calls to API with access token (never localStorage)
    ▼
apps/api (NestJS modular monolith)
    ├── PostgreSQL (system of record)
    ├── Redis (rate limit, cache of non-PHI, job coordination)
    ├── MinIO / S3 (objects; metadata in PostgreSQL)
    └── Keycloak (OIDC IdP; passwords never in RehabCRM)
```

Identity provider is replaceable (see [ADR-003](../adr/ADR-003-oidc-authentication.md)).

## 4. Module map (target)

API modules are organized by domain. Trivial modules stay simple; patient, rehabilitation, anatomy, and audit use stricter layering (`domain` / `application` / `infrastructure` / `presentation`).

| Module | Responsibility | Layering |
| --- | --- | --- |
| `identity` | Staff user projection from IdP, membership | standard |
| `organizations` | Organization, location, department | standard |
| `practitioners` | Clinical staff profile (optional on User) | standard |
| `authorization` | Permissions, resource policies | strong |
| `patients` | Patient CRM, contacts, consent, archive | strong |
| `appointments` | Scheduling, conflicts, status | standard+ |
| `encounters` | Actual clinical interactions | strong |
| `rehabilitation` | Plans, goals, phases, revision history | strong |
| `exercises` | Catalogue vs assignment (separate) | standard |
| `assessments` | Templates, results, measurements | strong |
| `anatomy` | Models, structures, annotations, heatmap data | strong |
| `documents` | Attachment metadata + storage keys | strong |
| `reports` | Read models / async export | separate from transactional core |
| `notifications` | Channel-agnostic staff notifications | standard |
| `audit` | Append-only audit events | strong |
| `health` | Liveness / readiness | trivial |

Frontend mirrors this as `apps/web/src/features/*`. Components do not own business rules.

## 5. Cross-cutting rules

- **Authorization is enforced only on the API.** UI permission checks hide controls; they are not security.
- **Organization isolation** is mandatory. Client-supplied `organizationId` is never trusted.
- **Audit** is append-only. Sensitive actions emit `AuditEvent` without logging secrets or unnecessary PHI.
- **The product does not diagnose.** Body annotations and heatmaps are clinician observations and visualizations of stored data.
- **AI (future):** labeled, editable, specialist-approved before entering the patient record.

## 6. Identifiers and time

- Public identifiers: UUID v7 (time-sortable) or UUID v4; **no sequential public IDs**.
- Timestamps: `timestamptz`.
- Optimistic concurrency: `version` on aggregates that concurrent staff edit (plans, appointments, clinical notes).

## 7. Related documents

- [Identity](./identity.md) · [Authentication flow](./authentication-flow.md)
- [Domain model](./domain-model.md)
- [Patient CRM](./patient-crm.md)
- [ERD](./erd.md)
- [Data flow](./data-flow.md)
- [FHIR mapping (future)](./fhir-mapping.md)
- [3D annotation model](./3d-annotation-model.md)
- [Access control](../security/access-control.md)
- [Threat model](../security/threat-model.md)
- [Roadmap](../ROADMAP.md)
- [Open questions](../OPEN_QUESTIONS.md)
