import { redirect } from 'next/navigation';
import { auth } from '../auth';
import { routeForRole } from '../features/patient-portal/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (session && !session.error) {
    const { serverApiFetch } = await import('../lib/api/server-api-client');
    try {
      const me = await serverApiFetch<{ role: string }>('/api/v1/me');
      redirect(routeForRole(me.role));
    } catch { redirect('/login?reason=denied'); }
  }
  redirect('/login');
}
