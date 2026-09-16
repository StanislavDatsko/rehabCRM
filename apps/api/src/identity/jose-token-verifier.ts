import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';
import { parseApiEnv } from '@repo/config/api-env';
import type { TokenVerifier, VerifiedAccessToken } from './token-verifier';
import { verifyAccessToken } from './verify-access-token';

@Injectable()
export class JoseTokenVerifier implements TokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly audience: string;

  constructor() {
    const env = parseApiEnv();
    const authUrl = new URL(env.NEON_AUTH_BASE_URL);
    this.issuer = authUrl.origin;
    this.audience = authUrl.origin;
    this.jwks = createRemoteJWKSet(new URL(`${env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`));
  }

  verify(accessToken: string): Promise<VerifiedAccessToken> {
    return verifyAccessToken(accessToken, this.jwks, this.issuer, this.audience);
  }
}
