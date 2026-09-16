import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '../../auth';
import { loadCurrentUser } from '../../lib/app/load-current-user';
import { logoutStaff } from '../../features/auth/actions';
import { serverApiFetch } from '../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';
export default async function PatientLayout({ children }: { children: ReactNode }) {
  const { data: session } = await auth.getSession();
  const user = await loadCurrentUser();
  if (!session?.user || user === 'unauthenticated') redirect('/login?reason=expired');
  if (user === 'denied' || user.role !== 'PATIENT') redirect('/app');
  const unread = await loadUnreadCount();
  const links = [['/patient', 'Огляд'], ['/patient/plan', 'Мій план'], ['/patient/progress', 'Мій прогрес'], ['/patient/daily-report', 'Щоденний звіт'], ['/patient/exercises', 'Вправи'], ['/patient/notifications', `Сповіщення${unread ? ` (${unread})` : ''}`]] as const;
  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-surface px-6 py-5 shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between"><div className="flex items-center gap-3"><div className="rc-gradient-brand flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white">R</div><div><p className="font-serif text-xl">REHABMIS</p><p className="text-xs text-text-secondary">Ваш шлях до відновлення</p></div></div><form action={logoutStaff}><button type="submit" className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary">Вийти</button></form></div><nav aria-label="Patient navigation" className="mx-auto mt-5 flex max-w-6xl flex-wrap gap-2 text-sm">{links.map(([href, label]) => <a key={href} href={href} aria-label={href.includes('notifications') ? `Сповіщення${unread ? `, ${unread} непрочитаних` : ''}` : undefined} className="rounded-lg px-3 py-2 text-text-secondary hover:bg-surface-muted hover:text-info">{label}</a>)}</nav></header><main className="mx-auto max-w-6xl px-6 py-8 lg:py-10">{children}</main></div>;
}
async function loadUnreadCount() { try { const result = await serverApiFetch<{ count: number }>('/api/v1/patient-portal/notifications/unread-count'); return result.count; } catch { return 0; } }
