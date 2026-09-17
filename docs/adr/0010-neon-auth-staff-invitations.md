# ADR 0010: Neon Auth identity, RehabMIS authorization, and staff invitations

## Status

Accepted for the `neon-auth-migration` rollout.

## Decision

Neon Managed Better Auth is the authentication authority: it owns credentials,
sessions, and the immutable identity subject. RehabMIS PostgreSQL remains the
authorization authority: it owns users, organization memberships, roles,
permissions, practitioner records, disabled semantics, invitations, and audit.

Administrators create a pending invitation containing only a SHA-256 token
hash. The raw token is sent through the configured mailer in the activation
URL and is never persisted or returned by production API responses. A claim
requires a valid Neon JWT whose email matches the invitation, and atomically
creates the RehabMIS authorization records and consumes the invitation.

## Security semantics

- An unmapped Neon identity has no RehabMIS access.
- Disabled users or memberships remain denied even with a valid JWT.
- Invitation claims are organization-scoped and audit logged.
- `SYSTEM_ADMIN` is a powerful actor role, but its target account remains
  protected from ordinary role changes and disabling.
- Session revocation is limited by the Neon Auth provider boundary; local
  authorization denial remains immediate.

## Rollback and operations

Migrations are additive or explicitly guarded and must be applied through the
normal deployment pipeline, never manually in production. If email delivery is
misconfigured, invitations are marked `DELIVERY_FAILED`; credentials and
authorization are not provisioned. Configure the production mail provider,
verify a test invitation, then deploy the API and web application. Rollback
must preserve the authorization database and use a forward migration for any
data decision, especially legacy role cleanup.
