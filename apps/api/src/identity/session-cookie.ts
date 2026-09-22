import type { CookieOptions } from 'express';

export const AUTH_SESSION_COOKIE = 'rehabmis_session';
export function sessionTtlSeconds(): number {
  const value = Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 604800);
  if (!Number.isInteger(value) || value < 1 || value > 604800) {
    throw new Error('AUTH_SESSION_TTL_SECONDS must be between 1 and 604800.');
  }
  return value;
}
export function sessionCookieOptions(): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: sessionTtlSeconds() * 1000 };
}
export function readSessionCookie(cookie?: string): string | undefined {
  const raw = cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_SESSION_COOKIE}=`))?.slice(AUTH_SESSION_COOKIE.length + 1);
  if (!raw) return undefined;
  try { return decodeURIComponent(raw); } catch { return undefined; }
}
