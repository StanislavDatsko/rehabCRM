import 'server-only';

import Redis from 'ioredis';
import { randomBytes } from 'node:crypto';

export type TokenSession = {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresAt: number;
};

const sessionTtlSeconds = 8 * 60 * 60;
const refreshSkewSeconds = 15;
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1 });

const key = (id: string) => `rehabmis:auth-session:${id}`;
const lockKey = (id: string) => `rehabmis:auth-session-refresh:${id}`;

async function client(): Promise<Redis> {
  if (redis.status === 'wait') await redis.connect();
  return redis;
}

export async function createTokenSession(state: TokenSession): Promise<string> {
  if (!state.accessToken || !state.refreshToken) throw new Error('Cannot create an incomplete auth session');
  const id = randomBytes(32).toString('base64url');
  await (await client()).set(key(id), JSON.stringify(state), 'EX', sessionTtlSeconds);
  return id;
}

export async function readTokenSession(id: string): Promise<TokenSession | null> {
  const value = await (await client()).get(key(id));
  if (!value) return null;
  try { return JSON.parse(value) as TokenSession; } catch { return null; }
}

export async function writeTokenSession(id: string, state: TokenSession): Promise<void> {
  if (!state.accessToken || !state.refreshToken) throw new Error('Cannot persist an incomplete auth session');
  await (await client()).set(key(id), JSON.stringify(state), 'EX', sessionTtlSeconds);
}

export async function deleteTokenSession(id: string): Promise<void> {
  await (await client()).del(key(id));
}

export async function ensureFreshAccessToken(id: string): Promise<string | null> {
  const current = await readTokenSession(id);
  if (!current) return null;
  if (current.expiresAt > Math.floor(Date.now() / 1000) + refreshSkewSeconds) return current.accessToken;

  const r = await client();
  const lock = randomBytes(16).toString('hex');
  if (await r.set(lockKey(id), lock, 'EX', 30, 'NX')) {
    try {
      const latest = await readTokenSession(id);
      if (!latest) return null;
      if (latest.expiresAt > Math.floor(Date.now() / 1000) + refreshSkewSeconds) return latest.accessToken;
      const response = await fetch(`${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: process.env.AUTH_KEYCLOAK_ID ?? '', client_secret: process.env.AUTH_KEYCLOAK_SECRET ?? '', grant_type: 'refresh_token', refresh_token: latest.refreshToken }),
      });
      const refreshed = await response.json() as { access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number };
      if (!response.ok || !refreshed.access_token || !refreshed.expires_in) { await deleteTokenSession(id); return null; }
      const updated = { accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token ?? latest.refreshToken, idToken: refreshed.id_token ?? latest.idToken, expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in };
      await writeTokenSession(id, updated);
      return updated.accessToken;
    } catch { await deleteTokenSession(id); return null; }
    finally { await r.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", 1, lockKey(id), lock); }
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    const latest = await readTokenSession(id);
    if (latest && latest.expiresAt > Math.floor(Date.now() / 1000) + refreshSkewSeconds) return latest.accessToken;
  }
  return null;
}
