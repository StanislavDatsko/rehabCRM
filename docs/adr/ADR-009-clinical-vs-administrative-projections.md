# ADR-009: Clinical vs administrative patient projections

## Context

Patient records will eventually hold or link to highly sensitive clinical artifacts (notes, plans, assessments, annotations). Receptionists need identity and contact data for desk workflows. Returning the full Prisma row (or a growing entity) on every patient endpoint would leak clinical fields as soon as columns or joins appear.

## Decision

- **Administrative projection** (`PatientAdministrativeResponse`): explicit mapped DTO for Phase 3 — identity, contacts, address, emergency contact, status, responsible practitioner summary, optional internal reference, `version`, timestamps. No clinical payloads.
- **Clinical projection**: separate DTO/endpoint(s) in later phases, gated by `patient.read.clinical` (and future care-relationship rules). Not implemented in Phase 3.
- Controllers never return raw ORM entities. Mappers whitelist fields; adding a clinical column to storage must not appear on admin responses by accident.
- Permission `patient.read.admin` is sufficient for admin projection. Holding `patient.read.clinical` does not change Phase 3 responses until clinical data exists.
- Document and administrative document classifications remain separate (see access control / Q13).

## Alternatives

- Single “full patient” response filtered in the UI — rejected (API remains the trust boundary).
- Role checks inside mappers instead of permissions — rejected (permissions are the contract).
- Defer projections until clinical modules ship — rejected (habits form now; Phase 3 is the root aggregate).

## Consequences

- Slightly more mapping code; safer evolution.
- Frontend must not assume admin GET will grow clinical tabs’ data; clinical features call clinical APIs.
- Authorization tests assert receptionist tokens never receive clinical-shaped payloads when those endpoints exist.
