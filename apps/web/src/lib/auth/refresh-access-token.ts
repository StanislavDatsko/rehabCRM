import type { JWT } from 'next-auth/jwt';

const refreshFlights = new Map<string, Promise<JWT>>();

export async function refreshAccessToken(token: JWT): Promise<JWT> {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;
  if (!issuer || !clientId || !clientSecret || !token.refreshToken) return { ...token, error: 'RefreshTokenError', accessToken: undefined };
  try {
    const response = await fetch(`${issuer}/protocol/openid-connect/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: token.refreshToken }) });
    const refreshed = (await response.json()) as { access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number };
    if (!response.ok || !refreshed.access_token || !refreshed.expires_in) return { ...token, error: 'RefreshTokenError', accessToken: undefined };
    return { ...token, accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token ?? token.refreshToken, idToken: refreshed.id_token ?? token.idToken, expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in, error: undefined };
  } catch { return { ...token, error: 'RefreshTokenError', accessToken: undefined }; }
}

export function refreshAccessTokenOnce(token: JWT): Promise<JWT> {
  if (!token.refreshToken) return refreshAccessToken(token);
  const existing = refreshFlights.get(token.refreshToken);
  if (existing) return existing;
  const refreshToken = token.refreshToken;
  const flight = refreshAccessToken(token).finally(() => { if (refreshFlights.get(refreshToken) === flight) refreshFlights.delete(refreshToken); });
  refreshFlights.set(refreshToken, flight);
  return flight;
}
