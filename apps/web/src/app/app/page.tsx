import type { CurrentUserResponse } from '@repo/contracts';
import { Overview } from '../../features/dashboard/overview';
import { serverApiFetch } from '../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function AppHomePage() {
  const user = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  return <Overview user={user} />;
}
