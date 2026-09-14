# ADR-003: OIDC authentication (Keycloak-compatible)

## Context

Staff authentication must not be a homemade password store. MFA, recovery, and disablement should live in a mature IdP. Tokens in `localStorage` are an XSS liability.

## Decision

- Authenticate staff with **OIDC Authorization Code + PKCE**.
- Local IdP: **Keycloak** in Docker; production may use another OIDC provider with the same claims contract (`sub`, `email`).
- **BFF session:** Next.js (or API) sets **httpOnly, Secure, SameSite** cookie. Access tokens are not stored in browser JS-accessible storage.
- NestJS is a **resource server**: validate JWT via JWKS (issuer, audience, exp, nbf).
- Authorization **permissions** are stored and evaluated in RehabCRM, not solely in IdP realm roles (IdP groups may seed membership).
- Logout: end app session + IdP end-session when configured.
- Password recovery and MFA: IdP features; RehabCRM does not implement custom email-reset of passwords.

## Alternatives

- Custom passport-local in Nest — rejected.
- SPA public client with silent refresh in localStorage — rejected.
- NextAuth-only without API JWT validation — rejected (API must not trust the UI).

## Consequences

- Replacing Keycloak requires issuer/JWKS config, not rewriting patient modules.
- Local DX depends on Docker Keycloak.
- CORS is strict; cookies need a documented local hostname strategy.
