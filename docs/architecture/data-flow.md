# Data flow

## 1. Authenticated staff request

```text
1. Browser holds only an httpOnly, Secure, SameSite session cookie (web BFF).
2. Next.js server validates session, attaches short-lived access token to API calls.
3. NestJS validates JWT (issuer, audience, expiry, signature via IdP JWKS).
4. Authorization service loads membership + permissions (never from client claims alone for resource checks).
5. Domain handler runs in a transaction when mutating aggregates.
6. Audit interceptor records the action with requestId (no secrets, minimize PHI).
7. Response DTO is mapped explicitly (no raw Prisma objects).
```

Access tokens **must not** be stored in `localStorage`.

## 2. Patient record read (staff — Phase 3 administrative)

```text
UI (Patients feature)
  → GET /api/v1/patients/:id
  → Org-scoped find (id + organizationId) → 404 if missing
  → Permission patient.read.admin
  → Explicit PatientAdministrativeResponse mapping (ADR-009)
```

Phase 3 does **not** emit noisy `PATIENT_VIEWED` audit events. Mutations write generic `AuditEvent` rows (`entityType = Patient`) in the same transaction with controlled metadata. Clinical projection is deferred until clinical modules exist.

## 3. Appointment scheduling

```text
UI Calendar
  → POST /api/v1/appointments
  → Validate window, org, patient, practitioner, location
  → Conflict detection (practitioner overlap; later room)
  → Optimistic version if updating
  → Appointment created SCHEDULED
  → Audit APPOINTMENT_CREATED
```

Creating an **Encounter** is a separate command (check-in / start visit), not an implicit side effect of booking.

## 4. Body annotation persistence

```text
AnatomyViewer (lazy-loaded R3F)
  → raycast → reviewed mapping + triangle/barycentric anchor
  → POST /api/v1/patients/:id/body-annotations
  → Authorize body_annotation.create + organization-scoped patient access
  → Validate mapping/version/stableMeshKey/primitive as one tuple
  → Persist BodyAnnotation + initial status history + audit in one transaction
  → GET reloads from API (source of truth), not from Three.js memory
```

Model URLs are short-lived signed GETs issued only after `anatomy_model.read`. Heatmap rendering consumes annotation **DTOs** and uses maximum active severity per structure; it does not invent clinical meaning.

## 5. File upload

```text
1. Client requests upload intent (filename, mime, size).
2. API authorizes, validates allow-list, creates Document/Attachment metadata (pending).
3. API returns short-lived signed PUT URL (MinIO/S3).
4. Client uploads bytes to object storage (not through API body for large files).
5. Client confirms; API verifies object exists, checksum, mime; marks available.
6. Download: authorized signed GET; audit DOCUMENT_DOWNLOADED.
```

PostgreSQL never stores file bytes.

## 6. Trust boundaries

See [threat-model.md](../security/threat-model.md). Bytes crossing the browser, Next.js, API, IdP, PostgreSQL, Redis, and object storage are distinct trust zones. Redis must not be used as a dump of charts.
