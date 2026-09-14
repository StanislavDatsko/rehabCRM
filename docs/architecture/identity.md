# Identity model

Staff authenticate. Patients do not.

```text
Keycloak User (sub)
        │
        │ mapped by identityProvider + identityProviderSubject
        ▼
User (RehabCRM)
        │
        ├── OrganizationMembership (org, role, status)
        └── Practitioner (optional, org-scoped)
```

## Provisioning (Phase 2)

1. Create the person in Keycloak (stable user id = OIDC `sub`).
2. Insert `User` with that `sub`.
3. Insert `OrganizationMembership` (and `Practitioner` if they are a clinician).
4. Login maps `sub` → User. No membership → 403.

There is no `PATIENT` role and no `User` row for patients.

## Organization context

If the user has exactly one **active** membership, that organization is the request context. Client-supplied organization headers/body are ignored. Multi-org switching is not in the UI yet; the resolver currently takes the oldest active membership.

## Disabled access

Keycloak may still authenticate. RehabCRM `User.status` or `OrganizationMembership.status` = `DISABLED` yields 403 with the same public message as an unknown user.

## Permissions

Roles map to permission strings in `apps/api/src/common/auth/role-permissions.ts`. Controllers use `@RequirePermissions(...)` meaning **ALL** listed permissions. UI hiding uses `/api/v1/me` permissions only for UX.

## Organization isolation (PHI resources)

Cross-organization resource access uses `findFirst({ id, organizationId })` and returns **404** (existence concealment). Phase 3 Patient APIs are the authoritative example; the temporary Phase 2 `AuthorizationProbe` fixture is retired.

## Logging vs audit

| Kind | Purpose |
| --- | --- |
| Operational logs (Pino) | Diagnostics; redacts Authorization and cookies |
| Security events (`SecurityEventLogger`) | ACCESS_DENIED reasons, no tokens |
| Business audit (`AuditEvent`) | Immutable generic trail with controlled metadata |

Do not treat Pino as the future audit log.
