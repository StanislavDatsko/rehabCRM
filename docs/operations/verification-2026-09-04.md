# Phase 9 verification evidence — 2026-09-04

Environment: local macOS workspace, synthetic repository data only.

## Passed code/static gates

- `pnpm lint`: pass, 7 workspace tasks.
- `pnpm typecheck`: pass, 7 workspace tasks.
- `pnpm test`: pass, 232 tests total (API 169, web 52, config 7, contracts 3, UI 1).
- `pnpm build`: pass; API and Next.js production builds completed. Shared web first-load JavaScript is 103 kB; staff list is 103 kB and staff profile is 108 kB.
- Prisma schema validation: pass with synthetic `DATABASE_URL`.
- Production Compose interpolation/config validation: pass with synthetic non-secret values and immutable example digests.
- Playwright discovery: pass, 28 tests across Chromium, Firefox, WebKit, and iPad Pro 11 projects. The mutating staff lifecycle is configured to execute once in Chromium and skip in the shared-stack projects.
- Keycloak realm JSON parse: pass. The local service account is limited to realm `manage-users` and `view-users`.

## 3D and Phase 7 evidence

- GLB inspection passed for muscles (26,483,756 bytes), skeleton (28,347,568 bytes), and joints (7,534,416 bytes). All inspected nodes and meshes are named; no duplicate node or mesh names were reported.
- Mapping validation passed: 60 mapped primitives against real GLB reports and 54 canonical structures, with no duplicate render mappings.
- Coverage report: 3,044 total mesh instances, 36 mapped mesh instances, 60 mapped primitives, 36 mapped structures, and 3,008 manual-review mesh instances. The conservative mapping policy remains unchanged.

## Blocked/unverified gates

- Docker CLI is installed, but the Docker daemon reports that it is not running. PostgreSQL, Redis, MinIO, Keycloak, API, and web could not be started as a real stack.
- Empty-database migration deployment, seed execution, staging migration rehearsal, rollback rehearsal, and live appointment-concurrency evidence were not run.
- OIDC discovery/login/refresh/logout, service-account provisioning, setup email, disable/enable, session termination, and cross-organization browser flows were not run.
- Playwright, axe, browser/device, 3D WebGL, report workflow, and k6 tests were discovered/defined but not executed.
- API/web container images were not built or scanned; gitleaks, Trivy, k6, age, and MinIO `mc` are not installed locally.
- `pnpm audit --audit-level high` was attempted inside and outside the sandbox; the npm advisory endpoint returned DNS failure and then socket timeouts. No vulnerability result was produced.
- PostgreSQL and object-storage backup/restore rehearsals, dashboards, alerts, TLS scan, error-tracker integration, accessibility manual review, and disaster-recovery timing remain unverified.

## Warnings

- Prisma still reports that `package.json#prisma` configuration is deprecated for Prisma 7.
- Next.js reports that its ESLint plugin is not detected in the shared ESLint configuration.

Verdict: **NOT YET PILOT READY**. Code/static success does not replace the blocked live-infrastructure release gates.
