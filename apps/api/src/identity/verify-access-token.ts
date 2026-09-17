import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { VerifiedAccessToken } from './token-verifier';

export async function verifyAccessToken(
  accessToken: string,
  jwks: JWTVerifyGetKey,
  issuer: string,
  audience: string,
): Promise<VerifiedAccessToken> {
  const { payload } = await jwtVerify(accessToken, jwks, {
    issuer,
    audience,
    clockTolerance: 5,
  });
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Token subject is missing');
  }
  return { subject: payload.sub, ...(typeof payload.email === 'string' ? { email: payload.email } : {}) };
}
