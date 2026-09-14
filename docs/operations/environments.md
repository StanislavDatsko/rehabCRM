# Environment separation and secrets

Development, test, staging, and production use separate databases, buckets, Redis instances/namespaces, identity realms/tenants, OIDC clients, encryption keys, service accounts, domains, and telemetry destinations. Production data must never be copied into lower environments. Lower environments use synthetic records only.

`DEPLOYMENT_ENV` declares the operational environment while `NODE_ENV=production` enables optimized runtime behavior for staging and production. In either hardened environment the configuration parser rejects HTTP public/identity/storage endpoints, loopback hosts, missing provisioning credentials, short/known development secrets, Swagger, debug/trace/silent logging, and missing release/schema identifiers.

Secrets are injected at runtime from the chosen secret manager, scoped per component, rotated on a documented schedule and after incidents, and excluded from images, Git, logs, client JavaScript, CI artifacts, and support tickets. `.env.production.example` contains names and placeholders only. Access to production secrets is reviewed with staff access at least quarterly.
