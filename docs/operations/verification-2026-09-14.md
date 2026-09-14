# Phase 9 live verification evidence — 2026-09-14

Environment: local macOS workspace, Docker Compose stack, synthetic verification data only. API was pointed at database `rehabcrm_verify`; credentials and tokens are intentionally omitted.

## Previously verified and retained

- Docker daemon, fresh `rehabcrm_verify` database, all 9 migrations from zero, migration status, and fresh seed: VERIFIED before this run.

## Infrastructure and API

- PostgreSQL, Redis, MinIO, and Keycloak containers: running; PostgreSQL and Redis healthy; published ports match the local Compose configuration.
- API: started successfully on port 3001 against `rehabcrm_verify`.
- Web: started successfully on port 3000.
- `/health/live`: HTTP 200, `status: ok`.
- `/health/ready`: HTTP 200; database, Redis, identity provider, and object storage all reported `ok`.
- `/health/info`: returned local version/schema metadata without secrets.

## Live OIDC and authorization

- `node scripts/verify-oidc-live.mjs`: PASS, 8/8 checks.
- Verified specialist, receptionist, disabled user, cross-organization patient denial, anonymous `/me`, and public health behavior.
- Browser login/logout, session revocation, required-action email, and full staff administration matrix: not fully evidenced in this run.

## Playwright and accessibility

- Initial run was blocked by missing browser binaries; installed via the repository `e2e:install` script.
- Full run: 28 discovered; 21 passed, 1 Firefox progress navigation timeout, 6 configured skips.
- Chromium: 7/7 passed.
- Firefox: 6/7 passed; the failed progress test passed on a targeted rerun twice.
- WebKit: 7/7 passed.
- Tablet: 7/7 passed.
- Axe checks included in the executed suite passed where the scenario completed. Manual keyboard/screen-reader review was not performed.
- The Firefox timeout is recorded as transient/flaky evidence, not silently ignored.

## Anatomy

- `pnpm --filter @rehabcrm/api anatomy:import -- --apply`: PASS.
- `muscles.glb`, `skeleton.glb`, and `joints.glb`: reviewed checksums matched; all reported `unchanged`.
- Import metadata/mappings: up to date; duplicate checksum behavior was idempotent.
- Real browser 3D smoke/performance scenario passed in Chromium, WebKit, and tablet projects. Visual alignment, signed URL expiry, annotation save/reload, and heatmap filters were not independently evidenced.
- Mapping remains conservative: 36 reviewed mapped structures, 60 mapped primitives, 3,008 mesh instances requiring manual review.

## Static gates

- `pnpm lint`: PASS, 7/7 workspace tasks.
- `pnpm typecheck`: PASS, 7/7 workspace tasks.
- `pnpm test`: PASS, 237 tests (API 172, web 54, config 7, contracts 3, UI 1).
- `pnpm build`: PASS, API and Next.js production builds.

## Remaining blockers

- Repository PostgreSQL backup/restore scripts now support the PostgreSQL 16 compose container (`PG_CLIENT_MODE=auto|docker`), avoiding dependence on incompatible host v14 tools. The earlier equivalent v16 container dump was encrypted successfully (167,279 bytes) and restored to isolated `rehabcrm_restore_verify`.
- Restored database counts: organizations 2, memberships 7, patients 24, appointments 6, encounters 1, assessments 3, measurements 9, plans 1, annotations 2, audit events 29. Clinical reports were 0 in the source dataset, so report post-restore smoke remains open.
- MinIO backup mirror and isolated restore completed: 3 model objects and 2 document objects. Destination versioning/encryption was not independently configured.
- k6 smoke executed 2 VUs/60 requests with p95 4.85 ms, but all requests failed authentication; valid load evidence remains open.
- Real appointment concurrency: PASS; two simultaneous creates returned exactly one 201 and one 409 `APPOINTMENT_TIME_CONFLICT`.
- Gitleaks working-tree scan: PASS, no leaks found; history scan BLOCKED because `.git` is absent.
- Dependency audit after remediation: 0 HIGH/CRITICAL, 4 MODERATE. `multer` was transitive through `@nestjs/platform-express`; the workspace override pins the compatible patched `multer@2.3.0`.
- Production images built and ran as uid 1000 non-root. Previous Trivy: API 4 CRITICAL, 57 HIGH; Web 4 CRITICAL, 54 HIGH. Findings are primarily Debian 12 runtime OS packages plus the previously remediated multer layer; a fresh post-remediation image scan remains required.
- CycloneDX SBOM generated at `output/security/rehabcrm-worktree-2026-09-14.cdx.json` with 944 components.
- API Dockerfile required a minimal fix: removed duplicate post-deploy Prisma generate step that failed isolated pnpm workspace resolution. Image rebuild passed.
- Dependency-failure drills, manual accessibility review, observability PHI inspection, CSP/CORS/CSRF/request-limit probes, and complete report/annotation persistence matrix remain incomplete.

Verdict: **NOT YET PILOT READY**.

## Supplemental verification — 2026-09-15

The following results supersede the corresponding open items above. Environment: local
macOS Apple Silicon, Docker Compose, synthetic verification data only.

- Node 22 static gates: lint, typecheck, build, and tests passed. Current test totals are
  API 173 and Web 54 (plus the workspace package tests).
- MinIO was corrected to the official pinned ARM64-capable image
  `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`; Compose pull, startup, authenticated
  private bucket upload/read, and readiness all passed.
- Encrypted PostgreSQL backup and isolated restore passed using PostgreSQL 16 container
  tools; restored schema contains 31 tables with representative users/patients present.
- Repository-native object-storage backup and isolated restore passed for document and model
  buckets.
- Authenticated k6 smoke passed: 2 VUs, 30 seconds, 60 requests, 0 authentication failures,
  0% request errors, p95 34.14 ms. Appointment concurrency passed with exactly one create
  and one `APPOINTMENT_TIME_CONFLICT`.
- Clinical report live flow passed: completed PDF generated, stored privately, downloaded via
  authorized signed URL, and audited. A second report received a distinct ID and completed
  VOID workflow.
- Signed object probe passed: unsigned 403, signed 200, expired 403.
- Dependency failure drills passed for PostgreSQL, Redis, Keycloak, and MinIO after adding a
  bounded 2-second readiness-probe timeout. Oversized JSON now returns 413 without echoing
  the body.
- Fresh API and Web production-image Trivy scans returned no unresolved HIGH/CRITICAL
  findings. Git-history and focused working-tree Gitleaks scans passed.
- Chromium E2E passed 5/7. Accessibility, core workflows, staff lifecycle, and isolation
  passed. The two remaining 3D canvas assertions fail in headless Chromium because WebGL is
  unavailable; the textual clinical fallback is visibly rendered and requires separate
  headed/display-backed verification.

Remaining pilot gates: headed WebGL and manual browser logout/session-revocation checks,
PHI/secret inspection across telemetry, report recovery after restore, and final evidence
reconciliation. Decision remains **NOT YET PILOT READY**.
