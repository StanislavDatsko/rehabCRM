# Identity vs application authorization

## Context

Keycloak (OIDC) authenticates staff. RehabCRM must authorize access to organizations, roles, and clinical permissions. IdP groups are easy to misuse as the only access-control list, and they are awkward to keep in lockstep with organization membership.

## Decision

- **Keycloak answers:** who is this person? (`sub`, email, authentication factors, password recovery, MFA).
- **PostgreSQL answers:** is this person a RehabCRM user, which organization memberships they have, which `StaffRole` applies, whether the user/membership is `ACTIVE`, and therefore which permissions they have.
- Successful OIDC authentication **does not** create organization membership.
- Unknown `sub` values are denied (403) with a generic message.
- Disabled RehabCRM users or memberships are denied even if Keycloak login succeeds.

Provisioning for Phase 2 is **explicit seed / admin process**, not just-in-time org join.

## Alternatives

- Keycloak realm roles as the sole ACL — rejected (wrong place for org-scoped clinical permissions).
- Auto-create membership on first login — rejected (anyone in the IdP would enter the clinic).
- Email as the join key — rejected (`sub` is the stable external identifier).

## Consequences

- Replacing Keycloak does not rewrite permission code.
- Operators must create both an IdP user and a RehabCRM `User` + `OrganizationMembership`.
- Tokens must not be treated as carrying application permissions (ignore custom role claims for authorization).
