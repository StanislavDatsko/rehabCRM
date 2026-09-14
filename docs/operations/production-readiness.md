# Production readiness matrix

Last reviewed: 2026-09-14

This matrix is the release gate for the first RehabCRM pilot. A code-complete item is not considered verified until its evidence has been produced in the target environment. `PASS` means the documented evidence exists, `PARTIAL` means implementation exists but live verification is incomplete, and `BLOCKED` means a required dependency or implementation is unavailable.

## Current decision

**NOT YET PILOT READY**

The local production-like stack is running and several live gates now have evidence. The decision remains blocked because backup/restore, security scans, load testing, failure-mode drills, and complete clinical/report/anatomy browser verification are not yet evidenced.

## Release gates

| Area | Status | Evidence required before pilot |
| --- | --- | --- |
| Staff administration | PARTIAL | Implementation and focused tests pass; real Keycloak provisioning, required-action email, session revocation, and browser flows remain unverified. |
| Production authentication | PARTIAL | Live OIDC script passed specialist, receptionist, disabled-user, cross-org, and public-health checks; browser login/logout/session-revoke evidence remains incomplete. |
| Authorization and organization isolation | PARTIAL | Live OIDC script passed role and cross-org checks; complete negative-permission matrix remains incomplete. |
| Configuration validation | PASS | API and web started against the verification stack; API readiness returned all four dependencies `ok`. |
| HTTP hardening | PARTIAL | CSP, security headers, exact CORS policy, CSRF posture, body-size limits, secure cookies, and route-specific throttles verified from the deployed edge. |
| Database migrations | PARTIAL | Empty-database migration and seed test passes in CI; staging forward migration and rollback/restore rehearsal are recorded. |
| PostgreSQL backup and restore | PARTIAL | Encrypted backup and isolated PostgreSQL restore completed against synthetic data; local v14 utilities mismatch the PostgreSQL 16 server. Full application post-restore smoke remains open. |
| Object-storage backup and restore | PARTIAL | Private MinIO backup mirror and isolated restore completed: 3 model objects and 2 document objects. Production versioning/encryption and application smoke remain open. |
| Observability | PARTIAL | Health, release metadata, W3C trace context, structured logs, safe metrics, and an error-tracker port exist; deployed dashboards/alerts are blocked. |
| Container hardening | PARTIAL | API and web production images built and run as uid 1000 non-root; dependency remediation removed runtime package HIGH findings, but base-image Trivy critical/high findings remain. |
| Deployment | PARTIAL | Provider-neutral runbook and validated production Compose configuration exist; staging execution is blocked. |
| CI security gates | PARTIAL | Workflow gates are defined and local lint/types/tests/build pass; first CI security/SBOM/container run is not available. |
| End-to-end workflows | PARTIAL | Real-stack Playwright ran 28 tests: 21 passed, 1 transient Firefox timeout, 6 configured skips for shared-stack mutation/3D projects; targeted Firefox rerun passed 2/2. |
| Browser/device compatibility | PASS | Chromium, Firefox, WebKit, and tablet projects executed; one Firefox timeout was reproduced as passing on targeted rerun. |
| Accessibility | PARTIAL | Real-stack Axe checks passed in executed browser projects; manual keyboard/screen-reader evidence remains outstanding. |
| Performance | PARTIAL | 2-VU k6 smoke executed 60 requests with p95 4.85 ms, but authentication setup produced 100% failed requests; valid load evidence remains open. |
| Appointment concurrency | PASS | Two simultaneous real API creates returned exactly one 201 and one 409 `APPOINTMENT_TIME_CONFLICT` against PostgreSQL. |
| 3D anatomy | PARTIAL | Apply/import verified all three reviewed GLBs as unchanged/idempotent; browser loading test passed, but signed-object, visual alignment, annotation persistence, and fallback evidence remain incomplete. |
| Disaster recovery | BLOCKED | Incident ownership, communications, RPO/RTO, restore sequence, dependency-failure behavior, and a completed rehearsal are documented. |
| Security review | PARTIAL | Threat model exists; ASVS 5 checklist, dependency/image findings, secrets audit, penetration-test scope, and accepted-risk register remain release gates. |
| Operations handoff | BLOCKED | Deployment, rollback, backup/restore, identity, incident-response, observability, data-retention, and access-review runbooks are approved by named owners. |

## Non-negotiable pilot blockers

1. Run the complete production-like stack with PostgreSQL, Keycloak, object storage, API, and web application.
2. Prove production OIDC and least-privilege staff provisioning without CRM-managed passwords.
3. Run empty-database migrations and a staging migration/restore rehearsal.
4. Complete encrypted PostgreSQL and object-storage backup/restore rehearsals and set approved RPO/RTO values.
5. Pass the CI security gates, real-stack E2E suite, accessibility checks, browser matrix, and load/concurrency tests.
6. Verify telemetry, alerting, TLS, secrets delivery, container hardening, rollback, and incident runbooks in staging.

## Evidence rules

- Do not mark a gate `PASS` from code inspection alone.
- Record the environment, release version, commit SHA, schema version, operator, timestamp, command or procedure, result, and linked artifact.
- Use synthetic patients only in non-production evidence.
- Never attach tokens, passwords, clinical notes, patient names, report contents, or signed object URLs to evidence.
- Any unrun infrastructure-dependent gate remains `BLOCKED`, even when its implementation is complete.
