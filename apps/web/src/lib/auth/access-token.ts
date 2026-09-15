import { getToken } from 'next-auth/jwt';
import { headers } from 'next/headers';
import { ensureFreshAccessToken, readTokenSession } from './token-session';

const secureAuthCookie = process.env.AUTH_URL?.startsWith('https://') ?? false;

export async function getAccessToken(): Promise<string | null> {
  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.AUTH_SECRET,
    secureCookie: secureAuthCookie,
  });
  if (!token?.authSessionId || token.error) return null;
  return ensureFreshAccessToken(token.authSessionId as string);
}

export async function getIdToken(): Promise<string | null> {
  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.AUTH_SECRET,
    secureCookie: secureAuthCookie,
  });
  if (!token?.authSessionId) return null;
  return (await readTokenSession(token.authSessionId as string))?.idToken ?? null;
}

export async function getAuthSessionId(): Promise<string | null> {
  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.AUTH_SECRET,
    secureCookie: secureAuthCookie,
  });
  return typeof token?.authSessionId === 'string' ? token.authSessionId : null;
}
