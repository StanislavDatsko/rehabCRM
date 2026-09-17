# ADR-001: Neon Managed Better Auth

## Decision

Neon Auth is RehabMIS authentication only. RehabMIS PostgreSQL remains the authoritative authorization source for users, memberships, roles, permissions, tenant isolation, and disabled status. Nest validates Neon EdDSA JWTs, then resolves the subject against its own database.

Staff onboarding uses a hashed, expiring RehabMIS invitation. The invitee signs up with Neon Auth and claims the invitation with a validated JWT; the claim transaction creates the internal user, membership, practitioner when applicable, audit event, and consumes the invitation.

## Consequences

Disabled users or memberships are rejected even while a Neon credential remains valid. Neon `ORGANIZATION_ADMIN` is not made a global Neon admin because that would cross tenant boundaries. Neon server-to-server ban/unban and session revocation are not available with an API key; session revoke is therefore exposed as an explicit unsupported capability, and no raw SQL is used against Neon Auth tables.

## Rollback

Keep the legacy identity records and Keycloak local infrastructure until production smoke tests pass. Rollback is an application deployment rollback plus restoring the previous identity-provider configuration; do not delete Neon identities or run destructive migration commands.
