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
    this.issuer = env.OIDC_ISSUER;
    this.audience = env.OIDC_AUDIENCE;
    this.jwks = createRemoteJWKSet(
      new URL(`${env.OIDC_ISSUER}/protocol/openid-connect/certs`),
    );
  }

  verify(accessToken: string): Promise<VerifiedAccessToken> {
    return verifyAccessToken(accessToken, this.jwks, this.issuer, this.audience);
  }
}
