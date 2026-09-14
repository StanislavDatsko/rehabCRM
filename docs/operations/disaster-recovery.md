# Disaster recovery plan

Disasters include database loss/corruption, object-storage loss, identity-provider outage, region loss, credential compromise, or an application release that corrupts data. The incident commander coordinates operations, security, privacy, clinical leadership, and communications.

Recovery order is networking/secrets, PostgreSQL into an isolated target, object storage to coordinated recovery points, identity connectivity, API migration/readiness, web, then synthetic smoke/E2E validation. Validate organization isolation, active/disabled membership denial, audit continuity, appointment constraints, assessment/plan/annotation/report foreign keys, report PDF retrieval, 3D assets, and backup point timestamps before cutover.

The application degrades explicitly when Redis, object storage, or OIDC is unavailable; PostgreSQL failure makes readiness `down`. Existing access tokens may temporarily authenticate during OIDC outage, while new login/refresh/provisioning fails. Clinical report/model operations fail closed when storage is unavailable.

Target RPO and RTO remain open policy decisions. No pilot approval is valid until the clinic and operator approve them and a timed rehearsal demonstrates them.
