import type { NextConfig } from 'next';

const origin = (value: string | undefined, fallback: string) => {
  try {
    return new URL(value ?? fallback).origin;
  } catch {
    return fallback;
  }
};
const apiOrigin = origin(process.env.NEXT_PUBLIC_API_URL, 'http://localhost:3001');
const storageOrigin = origin(process.env.NEXT_PUBLIC_S3_PUBLIC_URL, 'http://localhost:9000');
const hardenedDeployment = ['staging', 'production'].includes(
  process.env.DEPLOYMENT_ENV ?? 'development',
);
const developmentScriptSources = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: ${storageOrigin}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${developmentScriptSources}`,
  `connect-src 'self' ${apiOrigin} ${storageOrigin}`,
  `media-src 'self' blob: ${storageOrigin}`,
  "worker-src 'self' blob:",
  ...(hardenedDeployment ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@repo/ui', '@repo/contracts', '@repo/config'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
