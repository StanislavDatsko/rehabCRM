import { describe, expect, it } from 'vitest';
import { parseWebEnv } from './web-env';

describe('parseWebEnv', () => {
  it('rejects missing Auth.js secrets', () => {
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
        AUTH_SECRET: 'dev-only-auth-secret-not-for-production-use',
        AUTH_KEYCLOAK_ID: 'rehabcrm-web',
        AUTH_KEYCLOAK_SECRET: 'rehabcrm-web-dev-secret',
        AUTH_KEYCLOAK_ISSUER: 'http://localhost:8080/realms/rehabcrm',
      }),
    ).toThrow();
  });

  it('accepts a complete hardened production BFF configuration', () => {
    const env = parseWebEnv({
      NODE_ENV: 'production',
      DEPLOYMENT_ENV: 'production',
      API_INTERNAL_URL: 'http://api.internal:3001',
      NEXT_PUBLIC_API_URL: 'https://api.example.test',
      AUTH_SECRET: 'qA7sW2eD9rF4tG6yH8uJ1iK3oL5pZ0xC',
      AUTH_KEYCLOAK_ID: 'rehabcrm-web',
      AUTH_KEYCLOAK_SECRET: 'nM4bV7cX2zL8kJ5hG1fD9sA6pO3iU0yT',
      AUTH_KEYCLOAK_ISSUER: 'https://identity.example.test/realms/rehabcrm',
      AUTH_URL: 'https://app.example.test',
      WEB_PUBLIC_URL: 'https://app.example.test',
      APP_VERSION: '9.0.0',
      APP_COMMIT_SHA: '0123456789abcdef',
    });
    expect(env.DEPLOYMENT_ENV).toBe('production');
  });

  it('parses BFF OIDC configuration', () => {
    const env = parseWebEnv({
      AUTH_SECRET: 'dev-only-auth-secret-not-for-production-use',
      AUTH_KEYCLOAK_ID: 'rehabcrm-web',
      AUTH_KEYCLOAK_SECRET: 'rehabcrm-web-dev-secret',
      AUTH_KEYCLOAK_ISSUER: 'http://localhost:8080/realms/rehabcrm',
    });
    expect(env.AUTH_KEYCLOAK_ID).toBe('rehabcrm-web');
  });
});
