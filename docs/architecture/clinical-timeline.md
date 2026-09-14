# Clinical timeline

## Purpose

The clinical timeline is a specialist-only, read-only projection of meaningful care events. It is not a raw `AuditEvent` feed and does not expose security metadata, request IDs, or mutation payloads.

## Event projection

The allow-listed categories are `ENCOUNTER`, `ASSESSMENT`, `MEASUREMENT`, `REHABILITATION_PLAN`, `GOAL`, and `BODY_ANNOTATION`. Each item has a stable projection ID, clinical occurrence time, concise Ukrainian label, optional encounter context, source identity, and an application deep link.

Event time comes from the domain record: encounter `startedAt`, assessment/measurement `performedAt`, plan `createdAt`, published revision `effectiveFrom`, goal `updatedAt`, and body annotation `createdAt`. The API never substitutes audit-log ingestion time for a known clinical time.

`GET /api/v1/patients/:patientId/clinical-timeline` defaults to the last 90 days, accepts `from`, `to`, `category`, and `encounterId`, and caps a page at 50. Results are ordered by `(occurredAt DESC, stableId DESC)`. The opaque cursor encodes that pair; numbered page access is retained for basic navigation.

## Safety boundaries

- `clinical_timeline.read` is granted only to rehabilitation specialists.
- Every source query is bound to the authenticated organization and patient.
- Completed assessment measurements are excluded when the parent assessment is voided.
- Projection text is factual; it does not infer diagnosis, improvement, or clinical recommendations.
