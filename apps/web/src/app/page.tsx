import { redirect } from 'next/navigation';
import { routeForRole } from '../features/patient-portal/navigation';
import { serverApiFetch, ServerApiError } from '../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let me: { role: string };
  try {
    me = await serverApiFetch<{ role: string }>('/api/v1/me');
  } catch (error) {
    redirect(error instanceof ServerApiError && error.status === 403 ? '/login?reason=denied' : '/login');
  }
  redirect(routeForRole(me.role));
}
