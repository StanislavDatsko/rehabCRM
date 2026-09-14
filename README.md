# RehabCRM

Staff-only CRM and rehabilitation management platform for physical rehabilitation centers. Patients are **domain records**, not users. The product does not diagnose or prescribe treatment.

Documentation: [`docs/architecture/overview.md`](docs/architecture/overview.md) · [`docs/operations/production-readiness.md`](docs/operations/production-readiness.md) · [`docs/operations/deployment.md`](docs/operations/deployment.md) · [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Prerequisites

- Node.js 22+
- pnpm 9 (`corepack enable`)
- Docker (PostgreSQL, Redis, MinIO, Keycloak)

## Local setup

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm infra:up
# wait until Postgres and Keycloak are healthy (Keycloak first boot is slow)
pnpm --filter @rehabcrm/api exec prisma migrate deploy
pnpm --filter @rehabcrm/api prisma:seed
pnpm anatomy:inspect
pnpm anatomy:mappings
# dry-run verifies local model checksums; add -- --apply to upload to private S3/MinIO
pnpm anatomy:import
pnpm dev
```

- Web: http://localhost:3000 (redirects to `/login` or `/app`)
- API: http://localhost:3001/health/live · `/api/v1/me`
- OpenAPI (non-production): http://localhost:3001/api/docs
- Keycloak: http://localhost:8080 — see `infra/docker/keycloak/README.md`

Development staff passwords are **local-only** and listed in the Keycloak README.

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
# optional, with infra + API running:
node scripts/verify-oidc-live.mjs
# real-stack browser/accessibility matrix:
pnpm e2e
```

Production releases must also pass the secret/dependency/image scans, CycloneDX SBOM, empty-database migration, encrypted backup/restore rehearsal, k6 smoke/concurrency tests, and the live readiness matrix. Code completion alone is not pilot approval.

Do not commit `.env` or real credentials. Do not use real patient data in seeds.
