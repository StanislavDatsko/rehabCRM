# ADR-023: Staff provisioning across the identity and application boundaries

Status: Accepted for Phase 9

## Decision

RehabCRM never accepts, generates, stores, or resets a staff password. The application calls `IdentityProviderAdminPort`; the current adapter uses Keycloak's Admin API with a confidential client-credentials service account limited to `manage-users` and `view-users` in the RehabCRM realm. Provider-specific payloads do not enter the staff domain service.

Provisioning proceeds in this order:

1. Create an enabled external identity with `VERIFY_EMAIL` and `UPDATE_PASSWORD` required actions and no credential value.
2. In one PostgreSQL transaction, create `User`, `OrganizationMembership`, optional `Practitioner`, and `STAFF_CREATED` audit event.
3. If step 2 fails, disable the external identity as compensation. A failed compensation is logged without email, token, password, or patient data and requires operator reconciliation.
4. Trigger the provider's required-action email. Failure here does not delete the valid database record; the membership becomes `SETUP_ACTION_FAILED` and an administrator may resend it.
5. The first successful application login marks setup `ACTIVE`.

Membership changes use an optimistic `version`. Changing to rehabilitation specialist creates or reactivates a `Practitioner`. Changing away disables but never deletes that practitioner, preserving clinical foreign keys and history. The last active organization administrator cannot be disabled or changed to another role, and self-disable is rejected.

## Trade-offs

The identity provider and PostgreSQL cannot share a transaction. Compensation gives a safe failure state but requires reconciliation when the provider is unavailable. A membership disable is enforced immediately by the API even if provider synchronization is pending. Provider session revocation may leave an already-issued access token valid until its five-minute expiry; production incident procedures use membership disable for immediate application denial.

## Consequences

- Production requires a dedicated service client; master-realm administrator credentials and resource-owner passwords are forbidden.
- `identitySyncPending` is visible to administrators and monitoring.
- Email remains immutable in the Phase 9 CRM UI to avoid an unsafe partially synchronized identifier change.
- `SYSTEM_ADMIN` is not an assignable organization role.
