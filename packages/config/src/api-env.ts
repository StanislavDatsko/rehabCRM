import { z } from 'zod';

const insecureSecretMarkers = ['change-me', 'dev-only', 'local-only', 'rehabcrmsecret'];
const isLocal = (value: string) => {
  const host = new URL(value).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
};

export const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DEPLOYMENT_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3001),
    API_PUBLIC_URL: z.string().url().default('http://localhost:3001'),
    WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    SWAGGER_ENABLED: z
      .union([z.boolean(), z.string()])
      .transform((value) => value === true || value === 'true')
      .default(false),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().min(1),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_BUCKET_DOCUMENTS: z.string().min(1),
    S3_BUCKET_MODELS: z.string().min(1),
    S3_FORCE_PATH_STYLE: z
      .union([z.boolean(), z.string()])
      .transform((value) => value === true || value === 'true')
      .default(true),
    OIDC_ISSUER: z.string().url(),
    OIDC_AUDIENCE: z.string().min(1),
    OIDC_ADMIN_BASE_URL: z.string().url().optional(),
    OIDC_ADMIN_REALM: z.string().min(1).optional(),
    OIDC_ADMIN_CLIENT_ID: z.string().min(1).optional(),
    OIDC_ADMIN_CLIENT_SECRET: z.string().min(1).optional(),
    OIDC_ADMIN_ACTION_LIFESPAN_SECONDS: z.coerce
      .number()
      .int()
      .min(300)
      .max(86_400)
      .default(43_200),
    METRICS_TOKEN: z.string().optional(),
    APP_VERSION: z.string().min(1).default('0.0.0-dev'),
    APP_COMMIT_SHA: z.string().min(1).default('unknown'),
    DATABASE_SCHEMA_VERSION: z.string().min(1).default('unknown'),
    API_RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60_000),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  })
  .superRefine((env, context) => {
    const hardened = env.DEPLOYMENT_ENV === 'staging' || env.DEPLOYMENT_ENV === 'production';
    if (!hardened) return;
    const issue = (path: string, message: string) =>
      context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (env.NODE_ENV !== 'production')
      issue('NODE_ENV', 'staging/production deployments require NODE_ENV=production');
    for (const [name, url] of [
      ['API_PUBLIC_URL', env.API_PUBLIC_URL],
      ['WEB_PUBLIC_URL', env.WEB_PUBLIC_URL],
      ['S3_ENDPOINT', env.S3_ENDPOINT],
      ['OIDC_ISSUER', env.OIDC_ISSUER],
    ] as const) {
      if (new URL(url).protocol !== 'https:') issue(name, 'must use HTTPS');
      if (isLocal(url)) issue(name, 'must not use a loopback host');
    }
    if (!env.OIDC_ADMIN_BASE_URL) issue('OIDC_ADMIN_BASE_URL', 'is required');
    else {
      if (new URL(env.OIDC_ADMIN_BASE_URL).protocol !== 'https:')
        issue('OIDC_ADMIN_BASE_URL', 'must use HTTPS');
      if (isLocal(env.OIDC_ADMIN_BASE_URL))
        issue('OIDC_ADMIN_BASE_URL', 'must not use a loopback host');
    }
    for (const name of [
      'OIDC_ADMIN_REALM',
      'OIDC_ADMIN_CLIENT_ID',
      'OIDC_ADMIN_CLIENT_SECRET',
    ] as const) {
      if (!env[name]) issue(name, 'is required');
    }
    for (const [name, secret] of [
      ['S3_SECRET_KEY', env.S3_SECRET_KEY],
      ['OIDC_ADMIN_CLIENT_SECRET', env.OIDC_ADMIN_CLIENT_SECRET ?? ''],
      ['METRICS_TOKEN', env.METRICS_TOKEN ?? ''],
    ] as const) {
      if (secret.length < 32) issue(name, 'must contain at least 32 characters');
      if (insecureSecretMarkers.some((marker) => secret.toLowerCase().includes(marker))) {
        issue(name, 'contains a known development secret marker');
      }
    }
    if (env.SWAGGER_ENABLED) issue('SWAGGER_ENABLED', 'must be disabled');
    if (['debug', 'trace', 'silent'].includes(env.LOG_LEVEL))
      issue('LOG_LEVEL', 'must be info or stricter');
    if (/localhost|127\.0\.0\.1/.test(env.DATABASE_URL))
      issue('DATABASE_URL', 'must not use a loopback host');
    if (env.APP_VERSION === '0.0.0-dev') issue('APP_VERSION', 'must identify the release');
    if (env.APP_COMMIT_SHA === 'unknown')
      issue('APP_COMMIT_SHA', 'must identify the source revision');
    if (env.DATABASE_SCHEMA_VERSION === 'unknown')
      issue('DATABASE_SCHEMA_VERSION', 'must identify the schema');
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function parseApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  return apiEnvSchema.parse(source);
}
