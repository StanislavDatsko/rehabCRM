# BFF authentication (Auth.js + confidential client)

## Context

Staff browsers must not hold Keycloak access tokens. NestJS is a resource server. Next.js is the staff UI.

## Decision

- Next.js is a **confidential OIDC client** (Authorization Code + PKCE) via **Auth.js (Auth.js/NextAuth) Keycloak provider**.
- Session is an **encrypted httpOnly JWT cookie** (Auth.js). Access, refresh, and ID tokens live only inside that cookie, never in `localStorage` / `sessionStorage` / readable cookies.
- The `session` callback **must not** copy access tokens onto the object sent to Client Components.
- Server-only `getToken` + `serverApiFetch` attach `Authorization: Bearer` when calling NestJS.
- Browser JavaScript never calls NestJS with a bearer token.
- Cookie flags: `HttpOnly`, `SameSite=Lax` (required for OIDC redirect), `Secure` in production, `Path=/`.
- Session `maxAge` is 8 hours. Access tokens are refreshed with the refresh token; refresh failure clears application use of the session (`RefreshTokenError`) and sends the user to login.
- Logout clears the Auth.js session and redirects to Keycloak `end_session` with `id_token_hint` when available.

CSRF: the API is not cookie-authenticated. Cross-site posts cannot use the NestJS session. BFF mutations in this phase are Server Actions (Next.js origin check). SameSite=Lax reduces cookie-sending on cross-site POSTs. A future cookie-authenticated BFF proxy must add Origin checks; see the threat model.

## Alternatives

- Public SPA client with tokens in memory — rejected (XSS and no confidential client).
- NestJS as the login app — rejected (worse UX split; Auth.js is the mature BFF library).
- Manual OAuth implementation — rejected (PKCE/state/nonce already solved).

## Consequences

- Local development needs Keycloak + matching `AUTH_*` and `OIDC_*` issuers.
- Swagger bearer usage is **developer-only**, not the staff browser flow.
