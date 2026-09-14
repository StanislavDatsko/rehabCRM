# Deployment and rollback

## Supported topology

Deploy the web and API containers behind a TLS-terminating reverse proxy. Use PostgreSQL with point-in-time recovery, private S3-compatible object storage with encryption and versioning, Redis on a private network, and a production OIDC provider. The application containers are stateless and run as a non-root user with a read-only filesystem and writable `/tmp` only.

The API trusts exactly one proxy hop for client-IP rate limiting. It must never be exposed directly to an untrusted network, and the edge must replace—not append arbitrary client input to—the forwarding headers.

`infra/docker/docker-compose.production.yml` is a hardened topology reference, not a production credential store. It deliberately expects immutable image digests, an external secret env file, and externally hosted identity/object-storage endpoints. A managed container platform may implement the same boundaries.

## Release procedure

1. Create immutable API and web images tagged with release version and full commit SHA.
2. Generate and retain the CycloneDX SBOM; pass dependency, secret, and Trivy image gates.
3. Confirm an encrypted database backup, object-storage recovery point, and approved restore evidence.
4. Apply `prisma migrate deploy` from a one-shot release task. Never run the development seed in production.
5. Deploy API and wait for `/health/live`; require `/health/ready` to be `ok` or an explicitly accepted `degraded` state.
6. Deploy web, check TLS/HSTS/CSP/cookies, then run the staging smoke and Playwright suites.
7. Record release version, commit SHA, schema version, image digests, operator, timestamps, and evidence links.

## Rollback

Application rollback uses the immediately previous immutable image digests. Database migrations are forward-only by default. If a migration is not backward compatible, stop writes, restore PostgreSQL and object storage to the coordinated pre-release recovery point in an isolated environment, validate integrity, then cut over under the disaster-recovery runbook. Never issue an ad-hoc destructive schema rollback on the live database.

Rollback triggers include sustained 5xx rate, authentication failure, corrupted report/model retrieval, authorization regression, failed migration verification, or uncontained PHI exposure. The incident commander owns the decision and communication.
