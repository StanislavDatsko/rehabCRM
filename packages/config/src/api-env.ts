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
    AUTH_ALLOW_REGISTRATION: z.union([z.boolean(), z.enum(['true', 'false'])]).transform((value) => value === true || value === 'true').default(false),
    AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().max(604800).default(604800),
    EMAIL_PROVIDER: z.enum(['console', 'resend', 'gmail-api']).default('console'),
    EMAIL_FROM: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    GMAIL_API_CLIENT_ID: z.string().min(1).optional(),
    GMAIL_API_CLIENT_SECRET: z.string().min(1).optional(),
    GMAIL_API_REFRESH_TOKEN: z.string().min(1).optional(),
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
    METRICS_TOKEN: z.string().optional(),
    APP_VERSION: z.string().min(1).default('0.0.0-dev'),
    APP_COMMIT_SHA: z.string().min(1).default('unknown'),
    DATABASE_SCHEMA_VERSION: z.string().min(1).default('unknown'),
    API_RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60_000),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    PATIENT_MEDIA_MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(50_000_000),
    PATIENT_MEDIA_MAX_VIDEO_BYTES: z.coerce.number().int().positive().default(2_000_000_000),
    PATIENT_MEDIA_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  })
  .superRefine((env, context) => {
    const hardened = env.DEPLOYMENT_ENV === 'staging' || env.DEPLOYMENT_ENV === 'production';
    if (!hardened) return;
    const issue = (path: string, message: string) =>
      context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (env.NODE_ENV !== 'production')
      issue('NODE_ENV', 'staging/production deployments require NODE_ENV=production');
    if (!['resend', 'gmail-api'].includes(env.EMAIL_PROVIDER)) issue('EMAIL_PROVIDER', 'production requires a configured email provider');
    if (env.EMAIL_PROVIDER === 'resend' && !env.EMAIL_FROM) issue('EMAIL_FROM', 'is required for Resend');
    if (env.EMAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) issue('RESEND_API_KEY', 'is required for Resend');
    if (env.EMAIL_PROVIDER === 'gmail-api' && !env.EMAIL_FROM) issue('EMAIL_FROM', 'is required for Gmail API');
    if (env.EMAIL_PROVIDER === 'gmail-api' && !env.GMAIL_API_CLIENT_ID) issue('GMAIL_API_CLIENT_ID', 'is required for Gmail API');
    if (env.EMAIL_PROVIDER === 'gmail-api' && !env.GMAIL_API_CLIENT_SECRET) issue('GMAIL_API_CLIENT_SECRET', 'is required for Gmail API');
    if (env.EMAIL_PROVIDER === 'gmail-api' && !env.GMAIL_API_REFRESH_TOKEN) issue('GMAIL_API_REFRESH_TOKEN', 'is required for Gmail API');
    for (const [name, url] of [
      ['API_PUBLIC_URL', env.API_PUBLIC_URL],
      ['WEB_PUBLIC_URL', env.WEB_PUBLIC_URL],
      ['S3_ENDPOINT', env.S3_ENDPOINT],
    ] as const) {
      if (new URL(url).protocol !== 'https:') issue(name, 'must use HTTPS');
      if (isLocal(url)) issue(name, 'must not use a loopback host');
    }
    for (const [name, secret] of [
      ['S3_SECRET_KEY', env.S3_SECRET_KEY],
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
