import { z } from 'zod';

const insecureSecretMarkers = ['change-me', 'dev-only', 'local-only', 'rehabcrm-web-dev'];
const isLocal = (value: string) => {
  const host = new URL(value).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
};

export const webEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DEPLOYMENT_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    API_INTERNAL_URL: z.string().url().default('http://localhost:3001'),
    NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
    AUTH_SECRET: z.string().min(32),
    AUTH_KEYCLOAK_ID: z.string().min(1),
    AUTH_KEYCLOAK_SECRET: z.string().min(1),
    AUTH_KEYCLOAK_ISSUER: z.string().url(),
    AUTH_URL: z.string().url().default('http://localhost:3000'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_S3_PUBLIC_URL: z.string().url().optional(),
    APP_VERSION: z.string().min(1).default('0.0.0-dev'),
    APP_COMMIT_SHA: z.string().min(1).default('unknown'),
  })
  .superRefine((env, context) => {
    const hardened = env.DEPLOYMENT_ENV === 'staging' || env.DEPLOYMENT_ENV === 'production';
    if (!hardened) return;
    const issue = (path: string, message: string) =>
      context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (env.NODE_ENV !== 'production')
      issue('NODE_ENV', 'staging/production deployments require NODE_ENV=production');
    for (const [name, url] of [
      ['NEXT_PUBLIC_API_URL', env.NEXT_PUBLIC_API_URL],
      ['AUTH_KEYCLOAK_ISSUER', env.AUTH_KEYCLOAK_ISSUER],
      ['AUTH_URL', env.AUTH_URL],
      ['WEB_PUBLIC_URL', env.WEB_PUBLIC_URL],
    ] as const) {
      if (new URL(url).protocol !== 'https:') issue(name, 'must use HTTPS');
      if (isLocal(url)) issue(name, 'must not use a loopback host');
    }
    for (const [name, secret] of [
      ['AUTH_SECRET', env.AUTH_SECRET],
      ['AUTH_KEYCLOAK_SECRET', env.AUTH_KEYCLOAK_SECRET],
    ] as const) {
      if (secret.length < 32) issue(name, 'must contain at least 32 characters');
      if (insecureSecretMarkers.some((marker) => secret.toLowerCase().includes(marker))) {
        issue(name, 'contains a known development secret marker');
      }
    }
    if (env.APP_VERSION === '0.0.0-dev') issue('APP_VERSION', 'must identify the release');
    if (env.APP_COMMIT_SHA === 'unknown')
      issue('APP_COMMIT_SHA', 'must identify the source revision');
  });

export type WebEnv = z.infer<typeof webEnvSchema>;

export function parseWebEnv(source: NodeJS.ProcessEnv = process.env): WebEnv {
  return webEnvSchema.parse(source);
}
