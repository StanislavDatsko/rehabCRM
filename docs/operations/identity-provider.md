# Production identity-provider runbook

## Configuration

- Use a dedicated realm/tenant and HTTPS issuer with validated certificates.
- Register `rehabcrm-web` as a confidential authorization-code client with exact callback/logout URLs, PKCE S256, no wildcard origins, no implicit flow, and no direct-access grants.
- Register `rehabcrm-provisioner` as a service-account-only confidential client. Grant only realm `manage-users` and `view-users`; never grant master-realm administration.
- Deliver both client secrets through the deployment secret manager. Rotate independently and never expose them as `NEXT_PUBLIC_*` variables.
- Configure SMTP, verified sender, required actions, password policy, brute-force protection, short access-token lifetime, refresh-token rotation, and organization-approved MFA.

## Verification

Verify discovery/JWKS, login, refresh rotation, logout, setup email, email verification, password update, disabled-user denial, membership-disabled denial, role changes, and provider session termination. Record the issuer, client IDs, realm roles, token lifetimes, test identities, and sanitized results. Do not record tokens or passwords.

## Recovery

For an application/IdP mismatch, first make access safe by disabling the local membership. Inspect `identitySyncPending`, reconcile the provider identity by subject, then clear the flag only after verification. For lost service credentials, rotate in the provider and secret manager, restart API instances, and run a create/disable test using a synthetic identity.
