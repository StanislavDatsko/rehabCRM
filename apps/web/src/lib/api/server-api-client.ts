import 'server-only';

import { parseWebEnv } from '@repo/config/web-env';
import { randomUUID } from 'node:crypto';
import { getAccessToken } from '../auth/access-token';
import type { ApiErrorBody } from '@repo/contracts';

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
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ServerApiError(401, {
      code: 'UNAUTHENTICATED',
      message: 'Authentication is required.',
      requestId: 'local',
    });
  }

  const requestId = randomUUID();
  const response = await fetch(`${env.API_INTERNAL_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-request-id': requestId,
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
