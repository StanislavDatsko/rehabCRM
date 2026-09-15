# RehabMIS authentication architecture

The browser holds only the encrypted, HttpOnly Auth.js session cookie. Its JWT
contains an opaque `authSessionId`; Keycloak access, refresh, and ID tokens are
stored only in Redis under `rehabmis:auth-session:<id>` with an eight-hour TTL.

Every BFF request resolves the opaque ID from the Auth.js cookie and calls
`ensureFreshAccessToken`. A valid access token is returned with a 15-second
skew. If refresh is required, Redis `SET NX EX` elects one refresher per
session. The winner re-reads state, refreshes Keycloak, and replaces the whole
token bundle in one Redis `SET`, retaining a rotated refresh token. Other
requests re-read Redis and use the new access token; they never send the stale
token after a successful refresh. Refresh failures delete the session and fail
closed.

Logout reads the opaque ID, deletes its Redis state, clears Auth.js, and then
redirects through Keycloak logout using the ID token server-side. PostgreSQL
and the API remain the authority for identity, roles, organization isolation,
and permissions; Redis stores no authorization decisions.

After login, the root route resolves `/api/v1/me`: patients go to `/patient`,
staff go to `/app`, and unsupported roles are denied. Staff UI is never
rendered for a patient because the application layout checks the API-resolved
role before rendering `StaffShell`.
