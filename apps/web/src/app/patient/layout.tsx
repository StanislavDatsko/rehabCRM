import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '../../auth';
import { loadCurrentUser } from '../../lib/app/load-current-user';
import { logoutStaff } from '../../features/auth/actions';
import { serverApiFetch } from '../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';
export default async function PatientLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const user = await loadCurrentUser();
  if (!session || user === 'unauthenticated') redirect('/login?reason=expired');
  if (user === 'denied' || user.role !== 'PATIENT') redirect('/app');
  const unread = await loadUnreadCount();
  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-surface px-6 py-5"><div className="flex items-center justify-between"><p className="font-serif text-xl">REHABMIS</p><form action={logoutStaff}><button type="submit" className="text-sm text-text-secondary hover:text-text-primary">Вийти</button></form></div><nav className="mt-4 flex flex-wrap gap-5 text-sm"><a href="/patient">Огляд</a><a href="/patient/plan">Мій план</a><a href="/patient/progress">Мій прогрес</a><a href="/patient/daily-report">Щоденний звіт</a><a href="/patient/exercises">Вправи</a><a href="/patient/notifications" aria-label={`Сповіщення${unread ? `, ${unread} непрочитаних` : ''}`}>Сповіщення{unread ? ` (${unread})` : ''}</a></nav></header><main className="mx-auto max-w-5xl px-6 py-8">{children}</main></div>;
}
async function loadUnreadCount() { try { const result = await serverApiFetch<{ count: number }>('/api/v1/patient-portal/notifications/unread-count'); return result.count; } catch { return 0; } }
