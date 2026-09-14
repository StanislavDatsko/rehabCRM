# Local Keycloak

Realm file: `realm-rehabcrm.json` is imported on container start (`start-dev --import-realm`).

| Item | Value |
| --- | --- |
| URL | http://localhost:8080 |
| Admin | admin / admin (**local only**) |
| Realm | `rehabcrm` |
| Issuer | http://localhost:8080/realms/rehabcrm |
| BFF client | `rehabcrm-web` (confidential) |
| Client secret | `rehabcrm-web-dev-secret` (**local only**) |
| API audience | `rehabcrm-api` (protocol mapper on the BFF client) |
| Redirect URI | http://localhost:3000/api/auth/callback/keycloak |
| Provisioning client | `rehabcrm-provisioner` (service account only; local secret in `.env.example`) |
| Provisioning grants | Realm `manage-users` + `view-users`; no master-realm administration |

Keycloak stores no persistent volume in Compose, so each `pnpm infra:down -v` + `up` re-imports the realm.

If the realm already exists inside a reused container filesystem, import may be skipped. Reset:

```bash
pnpm infra:down
docker volume ls   # remove compose volumes if needed
pnpm infra:up
```

Development staff (fictional, **never production**):

| Username | Email | Password | RehabCRM role |
| --- | --- | --- | --- |
| receptionist | receptionist@rehabcrm.local | DevOnly!Receptionist1 | RECEPTIONIST |
| admin | admin@rehabcrm.local | DevOnly!OrgAdmin1 | ORGANIZATION_ADMIN |
| specialist | specialist@rehabcrm.local | DevOnly!Specialist1 | REHABILITATION_SPECIALIST |
| disabled-user | disabled-user@rehabcrm.local | DevOnly!DisabledUser1 | User DISABLED |
| disabled-membership | disabled-membership@rehabcrm.local | DevOnly!DisabledMem1 | Membership DISABLED |
| other-specialist | other-specialist@rehabcrm.local | DevOnly!OtherSpec1 | Specialist in other org |

OIDC `sub` values are the Keycloak user UUIDs in the realm file and must match `User.identityProviderSubject` in the Prisma seed.
