import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { verifyAccessToken } from './verify-access-token';

const ISSUER = 'https://auth.example.test';
const AUDIENCE = ISSUER;

async function jwtContext() {
  const pair = await generateKeyPair('EdDSA');
  const jwk = await exportJWK(pair.publicKey);
  const jwks = createLocalJWKSet({ keys: [{ ...jwk, kid: 'k1', alg: 'EdDSA', use: 'sig' }] });
  return { privateKey: pair.privateKey, jwks };
}

async function sign(privateKey: CryptoKey, claims: { iss: string; aud: string; exp?: number }) {
  let builder = new SignJWT({})
    .setProtectedHeader({ alg: 'EdDSA', kid: 'k1' })
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
  it('accepts a valid EdDSA token', async () => {
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
      iss: 'https://evil.example',
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

  it('rejects a token without a subject', async () => {
    const { privateKey, jwks } = await jwtContext();
    const token = await new SignJWT({}).setProtectedHeader({ alg: 'EdDSA', kid: 'k1' }).setIssuer(ISSUER).setAudience(AUDIENCE).setIssuedAt().setExpirationTime('5m').sign(privateKey);
    await expect(verifyAccessToken(token, jwks, ISSUER, AUDIENCE)).rejects.toThrow();
  });
});
