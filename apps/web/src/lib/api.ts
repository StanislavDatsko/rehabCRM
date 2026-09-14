import type { HealthLiveResponse } from '@repo/contracts';

export function apiBaseUrl(): string {
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export async function fetchLiveHealth(): Promise<HealthLiveResponse | null> {
  try {
    const response = await fetch(`${apiBaseUrl()}/health/live`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as HealthLiveResponse;
  } catch {
    return null;
  }
}
