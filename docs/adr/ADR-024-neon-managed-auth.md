# ADR-024: Neon Managed Better Auth

## Decision

Neon Auth provides authentication only. RehabMIS PostgreSQL remains authoritative for authorization, memberships, roles, permissions, tenant isolation, and disabled status. Nest validates Neon EdDSA JWTs and resolves subjects against its own database.

Staff onboarding uses an expiring, hashed RehabMIS invitation. The invitee signs up with Neon Auth and claims it with a validated JWT; the claim transaction creates the internal user, membership, optional practitioner, audit event, and consumes the invitation.

## Consequences

Disabled users or memberships are rejected even while a Neon credential remains valid. RehabMIS organization admins are not granted a global Neon admin role. Neon API-key service calls cannot ban users or revoke sessions; session revoke is therefore an explicit unsupported capability. No raw SQL is used against Neon Auth session tables.

## Rollback

Keep legacy identity records and local Keycloak infrastructure until production smoke tests pass. Rollback is an application deployment rollback plus restoring prior identity-provider configuration; do not delete Neon identities or run destructive migration commands.
