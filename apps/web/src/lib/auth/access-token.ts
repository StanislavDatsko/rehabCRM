import { getToken } from 'next-auth/jwt';
import { headers } from 'next/headers';

export async function getAccessToken(): Promise<string | null> {
  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  });
  if (!token?.accessToken || token.error) {
    return null;
  }
  return token.accessToken;
}

export async function getIdToken(): Promise<string | null> {
  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  });
  return token?.idToken ?? null;
}
