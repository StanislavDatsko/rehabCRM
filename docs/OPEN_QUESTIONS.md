# Open questions

## Phase 9 production operations policy

- What recovery point objective (RPO) and recovery time objective (RTO) does the clinic approve for PostgreSQL and object storage?
- Which hosting region, secret manager, managed PostgreSQL, object storage, email, error-tracking, metrics, and alerting providers are approved?
- Is MFA mandatory for every staff role at pilot, and which factors/recovery process are acceptable?
- What is the maximum acceptable residual access-token lifetime after session revocation? Phase 9 uses five-minute access tokens and immediate membership disable for emergency denial.
- Who owns 24/7 incidents, backup verification, access review, certificate rotation, dependency findings, and production releases?
- Which ASVS gaps require independent penetration testing or formal risk acceptance before pilot?
- What browser/tablet hardware is representative for 3D performance acceptance?

## Phase 8 reporting and longitudinal policy

- Which clinical report template and legal footer must the center approve before production use?
- What retention period and legal-hold process apply to completed and voided report objects?
- Should report generation remain synchronous or move to a durable worker queue before launch?
- Who may void a report, and is a second-person approval required?
- Should the explicit “all record” progress period remain available or require a narrower maximum?
- Which measurement unit conversions, if any, are clinically approved? Phase 8 compares exact stored units only.
- Should source snapshots eventually contain cryptographic hashes in addition to IDs and versions?
- Is assignment-based patient access required before any longitudinal/report rollout?

## Phase 7 anatomy and body-annotation policy

- Confirm the Z-Anatomy source license, version, attribution text, and commercial-use compatibility before any production upload.
- What attribution must be displayed in-product?
- Which anatomical terminology/code system should govern the canonical structure vocabulary?
- Who is authorized to clinically review and approve the remaining 3,008 unmapped mesh instances?
- How complete must mapping be before clinical launch?
- Should resolved annotations be reopenable? Phase 7 treats resolved records as read-only and uses a new annotation for recurrence.
- Is severity optional for every annotation type, and does the temporary 0–10 scale fit swelling, weakness, and restriction?
- Does the center approve maximum active severity per structure as the heatmap aggregation rule?
- What retention policy applies to model versions referenced by voided annotations?
- Who may void annotations beyond the temporary specialist permission?
- Should multiple 3D model providers be supported later?
- Should historical annotations ever be explicitly remapped between model versions?

## Phase 6 rehabilitation planning policy

- What minimum information is required before activating a plan beyond the temporary “one goal or prescription” rule?
- Can a patient have multiple ACTIVE rehabilitation plans simultaneously?
- Can multiple rehabilitation specialists co-own a plan?
- Which exercise library is officially approved by the center?
- Which contraindication and safety fields are mandatory?
- Which plan amendments require co-signing or approval?
- Should goal target attainment ever be suggested automatically from measurements?

## Phase 5 clinical assessment policy

- Which standardized physical rehabilitation scales will the center officially use?
- Which sample assessment templates should be reviewed and approved by the rehabilitation center before clinical use?
- Should specialists continue to access all organization patients or only assigned patients?
- What legally and operationally required amendment workflow should replace Phase 5's void-and-recreate policy?
- Which anatomical terminology should become canonical before 3D integration?

Critical product, safety, legal, and permission decisions that must not be silently invented. Engineering may proceed with the **stated default**; defaults are not final policy.

| ID | Topic | Default (safest reasonable) | Who must decide |
| --- | --- | --- | --- |
| Q1 | Operating jurisdiction and record-retention law | Treat records as retain-by-default; archive not erase | Legal |
| Q2 | GDPR vs other regimes | No compliance claims; EU-like minimization | Legal |
| Q3 | Mandatory MFA | IdP MFA **capable**; not forced in local Keycloak | Security + clinic |
| Q4 | SYSTEM_ADMIN access to PHI | No PHI by default; no break-glass in v1 | Security |
| Q5 | Care relationship (which specialists see which patients) | Temporary: any specialist in the same org with clinical permissions; tighten before production | Clinical lead |
| Q6 | Receptionist seeing date of birth | Allow (identity matching at desk) | Privacy + clinic |
| Q7 | Sex / gender fields | Single optional coded `sex` (`FEMALE \| MALE \| OTHER \| UNKNOWN`); no extra gender UX until asked | Clinical + privacy |
| Q8 | Walk-in encounter without appointment | Allow encounter without appointment | Clinical ops |
| Q9 | Who may activate a rehab plan | Owning specialist | Clinical lead |
| Q10 | Duplicate patient detection | Warn on same org + similar name + DOB; no silent merge | Clinical ops |
| Q11 | Appointment conflict: room vs practitioner | Practitioner overlap blocking; room warning later | Ops |
| Q12 | Clinical note amendment policy | Append revision; never invisible edit | Clinical + legal |
| Q13 | Document classification (admin vs clinical) | Required field; receptionist cannot set clinical | Privacy |
| Q14 | 3D model license for commercial clinic use | No third-party model in prod until license recorded | Product |
| Q15 | Heatmap aggregation rule | Max severity per structure in filtered window; labeled “observations only” | Clinical |
| Q16 | Ukrainian vs English as default locale | Ukrainian default UI; English keys in code | Product |
| Q17 | SYSTEM_ADMIN without organization | Allowed for health/config; blocked from patient routes | Security |
| Q18 | IdP in production (Keycloak vs cloud IdP) | Keycloak-compatible OIDC; production IdP TBD | Ops |
| Q19 | Malware scanning vendor | Hook only (no-op) until chosen | Security |
| Q20 | Org admin reading audit logs | Allowed for org-scoped audit; no clinical bodies in audit metadata | Security |
| Q21 | Require date of birth and/or phone on patient create | **Optional** in Phase 3 (only `firstName` + `lastName` required); clinic may mandate later for desk matching | Clinical ops + privacy |
| Q22 | Who may set status `ARCHIVED` | Anyone with `patient.change_status` in Phase 3; optionally restrict archive to org admin later | Clinical ops + security |
