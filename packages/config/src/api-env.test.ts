import { describe, expect, it } from 'vitest';
import { parseApiEnv } from './api-env';

describe('parseApiEnv', () => {
  it('parses required infrastructure URLs', () => {
    const env = parseApiEnv({
      DATABASE_URL: 'postgresql://rehabcrm:x@localhost:5432/rehabcrm',
      REDIS_URL: 'redis://localhost:6379',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'key',
      S3_SECRET_KEY: 'secret',
      S3_BUCKET_DOCUMENTS: 'docs',
      S3_BUCKET_MODELS: 'models',
      OIDC_ISSUER: 'http://localhost:8080/realms/rehabcrm',
      OIDC_AUDIENCE: 'rehabcrm-api',
    });
    expect(env.API_PORT).toBe(3001);
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('fails fast for insecure production configuration', () => {
    expect(() =>
      parseApiEnv({
        NODE_ENV: 'production',
        DEPLOYMENT_ENV: 'production',
        DATABASE_URL: 'postgresql://rehabcrm:change-me@localhost:5432/rehabcrm',
        REDIS_URL: 'redis://localhost:6379',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY: 'rehabcrm',
        S3_SECRET_KEY: 'rehabcrmsecret',
        S3_BUCKET_DOCUMENTS: 'docs',
        S3_BUCKET_MODELS: 'models',
        OIDC_ISSUER: 'http://localhost:8080/realms/rehabcrm',
        OIDC_AUDIENCE: 'rehabcrm-api',
        SWAGGER_ENABLED: 'true',
      }),
    ).toThrow();
  });

  it('accepts a complete hardened production configuration', () => {
    const env = parseApiEnv({
      NODE_ENV: 'production',
      DEPLOYMENT_ENV: 'production',
      API_PUBLIC_URL: 'https://api.example.test',
      WEB_PUBLIC_URL: 'https://app.example.test',
      DATABASE_URL: 'postgresql://rehabcrm:x@database.internal:5432/rehabcrm',
      REDIS_URL: 'rediss://redis.internal:6379',
      S3_ENDPOINT: 'https://objects.example.test',
      S3_REGION: 'eu-central-1',
      S3_ACCESS_KEY: 'key',
      S3_SECRET_KEY: `test-s3-${'x'.repeat(40)}`,
      S3_BUCKET_DOCUMENTS: 'docs',
      S3_BUCKET_MODELS: 'models',
      OIDC_ISSUER: 'https://identity.example.test/realms/rehabcrm',
      OIDC_AUDIENCE: 'rehabcrm-api',
      OIDC_ADMIN_BASE_URL: 'https://identity.example.test',
      OIDC_ADMIN_REALM: 'rehabcrm',
      OIDC_ADMIN_CLIENT_ID: 'rehabcrm-provisioner',
      OIDC_ADMIN_CLIENT_SECRET: `test-admin-${'x'.repeat(40)}`,
      METRICS_TOKEN: `test-metrics-${'x'.repeat(40)}`,
      APP_VERSION: '9.0.0',
      APP_COMMIT_SHA: '0123456789abcdef',
      DATABASE_SCHEMA_VERSION: '20260904100000_staff_administration',
    });
    expect(env.DEPLOYMENT_ENV).toBe('production');
  });
});
