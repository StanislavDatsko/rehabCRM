# Authentication flow

```mermaid
sequenceDiagram
  actor Staff
  participant Browser
  participant Next as Next.js BFF
  participant KC as Keycloak
  participant API as NestJS
  participant DB as PostgreSQL

  Staff->>Browser: Open /login
  Browser->>Next: GET /login
  Staff->>Browser: Увійти в систему
  Browser->>Next: Server Action signIn(keycloak)
  Next->>KC: Authorization Code + PKCE
  Staff->>KC: Username/password (IdP UI)
  KC->>Next: Redirect + authorization code
  Next->>KC: Token exchange (client secret)
  KC->>Next: access_token, refresh_token, id_token
  Next->>Browser: Set httpOnly encrypted session cookie
  Note over Browser: No access token in JavaScript

  Staff->>Browser: Open /app
  Browser->>Next: Cookie
  Next->>Next: Decrypt session, refresh if needed
  Next->>API: GET /api/v1/me Bearer access_token
  API->>KC: JWKS (cached)
  API->>API: Verify iss, aud, exp, signature
  API->>DB: User by sub + active membership
  API->>Next: CurrentUser DTO
  Next->>Browser: Staff shell HTML
```

## Token refresh

When the access token is near expiry, Next.js uses the refresh token at the Keycloak token endpoint (server-side). Failure sets `RefreshTokenError`; middleware sends the user to `/login?reason=expired`.

## Logout

1. Clear Auth.js cookie.
2. Redirect to Keycloak logout (`id_token_hint` when present).
3. Return to `/login`.

## Disabled user

Keycloak login can succeed. NestJS resolves the user, sees `DISABLED`, returns 403. The app redirects to `/login?reason=denied`.
