import { describe, expect, it, vi } from 'vitest';
import { refreshAccessTokenOnce } from './refresh-access-token';

describe('refreshAccessTokenOnce', () => {
  it('coalesces concurrent refreshes and keeps the rotated refresh token', async () => {
    vi.stubEnv('AUTH_KEYCLOAK_ISSUER', 'http://localhost:8080/realms/rehabcrm');
    vi.stubEnv('AUTH_KEYCLOAK_ID', 'rehabcrm-web');
    vi.stubEnv('AUTH_KEYCLOAK_SECRET', 'test-secret');
    const fetchMock = vi.fn().mockImplementation(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); return new Response(JSON.stringify({ access_token: 'new-access', refresh_token: 'rotated-refresh', id_token: 'new-id', expires_in: 300 }), { status: 200 }); });
    vi.stubGlobal('fetch', fetchMock);
    const token = { accessToken: undefined, refreshToken: 'old-refresh', expiresAt: 0 };
    const [first, second] = await Promise.all([refreshAccessTokenOnce(token), refreshAccessTokenOnce(token)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.refreshToken).toBe('rotated-refresh');
    expect(second).toEqual(first);
    vi.unstubAllEnvs(); vi.unstubAllGlobals();
  });
});
