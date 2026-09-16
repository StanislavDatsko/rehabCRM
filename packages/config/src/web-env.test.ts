import { describe, expect, it } from 'vitest';
import { parseWebEnv } from './web-env';

describe('parseWebEnv', () => {
  it('rejects missing Neon Auth secrets', () => {
    expect(() =>
      parseWebEnv({
        API_INTERNAL_URL: 'http://localhost:3001',
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      }),
    ).toThrow();
  });

  it('rejects development URLs and secrets in production', () => {
    expect(() =>
      parseWebEnv({
        NODE_ENV: 'production',
        DEPLOYMENT_ENV: 'production',
        NEON_AUTH_BASE_URL: 'http://localhost:3000/neondb/auth',
        NEON_AUTH_COOKIE_SECRET: 'dev-only-neon-auth-cookie-secret-change-me',
      }),
    ).toThrow();
  });

  it('accepts a complete hardened production BFF configuration', () => {
    const env = parseWebEnv({
      NODE_ENV: 'production',
      DEPLOYMENT_ENV: 'production',
      API_INTERNAL_URL: 'http://api.internal:3001',
      NEXT_PUBLIC_API_URL: 'https://api.example.test',
      NEON_AUTH_BASE_URL: 'https://auth.example.test/neondb/auth',
      NEON_AUTH_COOKIE_SECRET: `test-neon-auth-${'x'.repeat(40)}`,
      WEB_PUBLIC_URL: 'https://app.example.test',
      APP_VERSION: '9.0.0',
      APP_COMMIT_SHA: '0123456789abcdef',
    });
    expect(env.DEPLOYMENT_ENV).toBe('production');
  });

  it('parses Neon Auth configuration', () => {
    const env = parseWebEnv({
      NEON_AUTH_BASE_URL: 'http://localhost:3000/neondb/auth',
      NEON_AUTH_COOKIE_SECRET: 'dev-only-neon-auth-cookie-secret-change-me',
    });
    expect(env.NEON_AUTH_BASE_URL).toContain('neondb/auth');
  });
});
