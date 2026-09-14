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
