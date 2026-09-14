import 'server-only';

import type { CurrentUserResponse } from '@repo/contracts';
import { ServerApiError, serverApiFetch } from '../api/server-api-client';

export type LoadCurrentUserResult = CurrentUserResponse | 'unauthenticated' | 'denied';

export async function loadCurrentUser(): Promise<LoadCurrentUserResult> {
  try {
    return await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 401) {
      return 'unauthenticated';
    }
    if (error instanceof ServerApiError && error.status === 403) {
      return 'denied';
    }
    throw error;
  }
}
