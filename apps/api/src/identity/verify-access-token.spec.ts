import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { verifyAccessToken } from './verify-access-token';

const ISSUER = 'http://localhost:8080/realms/rehabcrm';
const AUDIENCE = 'rehabcrm-api';

async function jwtContext() {
  const pair = await generateKeyPair('RS256');
  const jwk = await exportJWK(pair.publicKey);
  const jwks = createLocalJWKSet({ keys: [{ ...jwk, kid: 'k1', alg: 'RS256', use: 'sig' }] });
  return { privateKey: pair.privateKey, jwks };
}

async function sign(privateKey: CryptoKey, claims: { iss: string; aud: string; exp?: number }) {
  let builder = new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setSubject('user-1')
    .setIssuer(claims.iss)
    .setAudience(claims.aud)
    .setIssuedAt();
  if (claims.exp !== undefined) {
    builder = builder.setExpirationTime(claims.exp);
  } else {
    builder = builder.setExpirationTime('5m');
  }
  return builder.sign(privateKey);
}

describe('verifyAccessToken', () => {
  it('accepts a valid RS256 token', async () => {
    const { privateKey, jwks } = await jwtContext();
    const token = await sign(privateKey as CryptoKey, { iss: ISSUER, aud: AUDIENCE });
    await expect(verifyAccessToken(token, jwks, ISSUER, AUDIENCE)).resolves.toEqual({
      subject: 'user-1',
    });
  });

  it('rejects expired tokens', async () => {
    const { privateKey, jwks } = await jwtContext();
    const token = await sign(privateKey as CryptoKey, {
      iss: ISSUER,
      aud: AUDIENCE,
      exp: Math.floor(Date.now() / 1000) - 30,
    });
    await expect(verifyAccessToken(token, jwks, ISSUER, AUDIENCE)).rejects.toThrow();
  });

  it('rejects the wrong issuer', async () => {
    const { privateKey, jwks } = await jwtContext();
    const token = await sign(privateKey as CryptoKey, {
      iss: 'http://evil.example/realms/rehabcrm',
      aud: AUDIENCE,
    });
    await expect(verifyAccessToken(token, jwks, ISSUER, AUDIENCE)).rejects.toThrow();
  });

  it('rejects the wrong audience', async () => {
    const { privateKey, jwks } = await jwtContext();
    const token = await sign(privateKey as CryptoKey, { iss: ISSUER, aud: 'not-the-api' });
    await expect(verifyAccessToken(token, jwks, ISSUER, AUDIENCE)).rejects.toThrow();
  });

  it('rejects an invalid signature', async () => {
    const signer = await jwtContext();
    const other = await jwtContext();
    const token = await sign(signer.privateKey as CryptoKey, { iss: ISSUER, aud: AUDIENCE });
    await expect(verifyAccessToken(token, other.jwks, ISSUER, AUDIENCE)).rejects.toThrow();
  });
});
