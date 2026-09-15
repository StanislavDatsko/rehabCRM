import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const locks = new Set<string>();

vi.mock('server-only', () => ({}));
vi.mock('ioredis', () => ({ default: class FakeRedis {
  status = 'wait';
  async connect() { this.status = 'ready'; }
  async set(key: string, value: string, ...args: unknown[]) { if (args.includes('NX') && locks.has(key)) return null; if (args.includes('NX')) locks.add(key); store.set(key, value); return 'OK'; }
  async get(key: string) { return store.get(key) ?? null; }
  async del(key: string) { store.delete(key); locks.delete(key); return 1; }
  async eval(_script: string, _count: number, key: string) { locks.delete(key); return 1; }
} }));

import { createTokenSession, ensureFreshAccessToken, readTokenSession, deleteTokenSession } from './token-session';

describe('Redis token session', () => {
  beforeEach(() => { store.clear(); locks.clear(); vi.restoreAllMocks(); });

  it('refreshes once, persists rotated refresh token, and serves the new token concurrently', async () => {
    vi.stubEnv('AUTH_KEYCLOAK_ISSUER', 'http://keycloak.test');
    vi.stubEnv('AUTH_KEYCLOAK_ID', 'web');
    vi.stubEnv('AUTH_KEYCLOAK_SECRET', 'secret');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 'new-a', refresh_token: 'new-r', id_token: 'new-i', expires_in: 300 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const id = await createTokenSession({ accessToken: 'old-a', refreshToken: 'old-r', expiresAt: 0 });
    const result = await Promise.all([ensureFreshAccessToken(id), ensureFreshAccessToken(id)]);
    expect(result).toEqual(['new-a', 'new-a']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await readTokenSession(id)).toMatchObject({ accessToken: 'new-a', refreshToken: 'new-r', idToken: 'new-i' });
  });

  it('deletes the token bundle on cleanup', async () => {
    const id = await createTokenSession({ accessToken: 'a', refreshToken: 'r', expiresAt: 9999999999 });
    await deleteTokenSession(id);
    expect(await readTokenSession(id)).toBeNull();
  });
});
