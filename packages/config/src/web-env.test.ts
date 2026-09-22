import { describe, expect, it } from 'vitest';
import { parseWebEnv } from './web-env';

describe('parseWebEnv', () => {
  it('does not require an external auth provider', () => {
    expect(parseWebEnv({ API_INTERNAL_URL: 'http://localhost:3001', NEXT_PUBLIC_API_URL: 'http://localhost:3001' }).AUTH_ALLOW_REGISTRATION).toBe(true);
  });

  it('rejects development URLs and secrets in production', () => {
    expect(() =>
      parseWebEnv({
        NODE_ENV: 'production',
        DEPLOYMENT_ENV: 'production',
      }),
    ).toThrow();
  });

  it('accepts a complete hardened production BFF configuration', () => {
    const env = parseWebEnv({
      NODE_ENV: 'production',
      DEPLOYMENT_ENV: 'production',
      API_INTERNAL_URL: 'http://api.internal:3001',
      NEXT_PUBLIC_API_URL: 'https://api.example.test',
      WEB_PUBLIC_URL: 'https://app.example.test',
      APP_VERSION: '9.0.0',
      APP_COMMIT_SHA: '0123456789abcdef',
    });
    expect(env.DEPLOYMENT_ENV).toBe('production');
  });

  it('defaults registration on for local development', () => {
    expect(parseWebEnv({}).AUTH_ALLOW_REGISTRATION).toBe(true);
  });
});
