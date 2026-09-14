# Production test strategy

## Automated layers

- Unit/contract tests run on every change and cover validation, role permissions, organization scoping, state transitions, optimistic concurrency, immutable reports, anatomy mapping, staff provisioning compensation, and production configuration rejection.
- The migration CI job starts an empty PostgreSQL 16 database, applies every migration, executes the synthetic seed with `NODE_ENV=test`, and validates the schema.
- The real-stack Playwright suite uses PostgreSQL, Redis, MinIO, Keycloak, API, and web. It covers receptionist access, specialist progress/report/3D workflows, organization-admin staff lifecycle, cross-organization denial, axe checks, and 3D load budget.
- The browser matrix is current stable Chromium, Firefox, WebKit, and iPad Pro 11 emulation. Before pilot, manually verify a clinic desktop, a representative tablet, keyboard-only operation, focus order, zoom/reflow, and one supported screen reader.
- k6 smoke thresholds are under 1% request errors and p95 under 750 ms for a small authenticated load. Appointment concurrency requires exactly one creation and one `APPOINTMENT_TIME_CONFLICT` for simultaneous overlapping requests.

## Release-only verification

Run encrypted database/object restore, object integrity retrieval, production OIDC required actions, disabled membership denial, provider session revocation, security headers/TLS scan, secret/dependency/image scans, SBOM review, dashboards/alerts, container shutdown, and rollback. Use synthetic patients and retain sanitized artifacts.

An unavailable dependency, browser, scanner, or environment is a blocked gate rather than a pass. Threshold changes require recorded evidence and approval; do not relax them solely to make CI green.
