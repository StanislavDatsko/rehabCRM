import { redirect } from 'next/navigation';
import { auth } from '../auth';
import { routeForRole } from '../features/patient-portal/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (session && !session.error) {
    const { serverApiFetch } = await import('../lib/api/server-api-client');
    let me: { role: string };
    try {
      me = await serverApiFetch<{ role: string }>('/api/v1/me');
    } catch { redirect('/login?reason=denied'); }
    redirect(routeForRole(me.role));
  }
  redirect('/login');
}
