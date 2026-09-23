import 'server-only';

import { parseWebEnv } from '@repo/config/web-env';
import { randomUUID } from 'node:crypto';
import type { ApiErrorBody } from '@repo/contracts';
import { headers } from 'next/headers';

export class ServerApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    super(body?.message ?? 'API request failed');
    this.name = 'ServerApiError';
  }
}

export async function serverApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const env = parseWebEnv();
  const requestId = randomUUID();
  const cookieHeader = (await headers()).get('cookie') ?? '';
  const response = await fetch(`${env.API_INTERNAL_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'x-request-id': requestId,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }
    throw new ServerApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
