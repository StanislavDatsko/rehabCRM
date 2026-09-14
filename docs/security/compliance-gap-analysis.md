# Compliance gap analysis

**This product does not claim GDPR, HIPAA, or any other healthcare compliance.** Technical features are necessary but not sufficient. Legal counsel and a DPO/privacy officer (as applicable) must review before processing real patient data.

Assumed likely operating context: rehabilitation center in Ukraine with Ukrainian-language UI, possible EU data-subject overlap — **not confirmed** ([OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md)).

## Technical safeguards (intended / in architecture)

| Area | Current phase | Notes |
| --- | --- | --- |
| Unique staff authentication via OIDC | Phase 1–2 | Keycloak locally; replaceable IdP |
| Authorization deny-by-default design | Documented; impl Phase 2 | RBAC + resource rules |
| Organization scoping of PHI | Documented | |
| TLS in transit | Ops | Local HTTP in docker is not production |
| Encryption at rest | Ops / provider | Must be enabled on PostgreSQL disk and object storage |
| Audit trail design | Documented; impl with CRM | Append-only events; minimize PHI in metadata |
| Access tokens not in localStorage | Architecture | BFF httpOnly cookie |
| Input validation | Phase 1 foundation | class-validator / Zod |
| Separate object storage for files | Phase 1 infra | MinIO/S3 |
| Secrets not in git | Phase 1 | `.env.example` only |
| Patient is not a login | Documented | |

## Legal / policy gaps (require professionals)

| Requirement | Status |
| --- | --- |
| Lawful basis for processing health data | Not assessed |
| Patient information notices / consent language | Consent **entity** planned; legal text is not engineering |
| DPIA / PIA | Not done |
| Data processing agreements with hosting, IdP, email | Not done |
| Cross-border transfer (EU/US cloud) | Not decided |
| Retention schedules and legal holds | Open question |
| Right of access / export process and identity verification of requester | Export architecture later; process missing |
| Right of erasure vs medical record retention laws | Conflict possible; do not implement casual delete |
| Breach notification procedures | Not defined |
| Workforce confidentiality agreements | Policy |
| HIPAA BAA, if US PHI ever processed | Not applicable until decided; **do not claim HIPAA** |
| Medical device regulation if 3D/heatmap were marketed as diagnostic | Product must **not** present as diagnostic; legal review of claims |
| License compliance for 3D assets | Per-model records required |
| Staff MFA policy (mandatory vs optional) | Open |

## Jurisdiction-dependent

- Ukraine: personal data protection law, health records retention, licensing of medical practice documentation.
- EU GDPR: special category data (health), DPO, records of processing.
- US HIPAA: only if a covered entity/business associate relationship exists.

Engineering must not encode a single jurisdiction's erasure rules as if they were universal.

## Honest statement for stakeholders

Phase 1 delivers a **secure-by-default engineering foundation**, not a compliance certification.
