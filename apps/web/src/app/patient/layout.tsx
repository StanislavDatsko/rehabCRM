import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { loadCurrentUser } from '../../lib/app/load-current-user';
import { logoutStaff } from '../../features/auth/actions';
import { serverApiFetch } from '../../lib/api/server-api-client';
import { PatientNav } from '../../features/patient-portal/patient-nav';

export const dynamic = 'force-dynamic';
export default async function PatientLayout({ children }: { children: ReactNode }) {
  const user = await loadCurrentUser();
  if (user === 'unauthenticated') redirect('/login?reason=expired');
  if (user === 'denied' || user.role !== 'PATIENT') redirect('/app');
  const unread = await loadUnreadCount();
  const links = [['/patient', 'Огляд'], ['/patient/plan', 'Мій план'], ['/patient/progress', 'Мій прогрес'], ['/patient/daily-report', 'Щоденний звіт'], ['/patient/exercises', 'Вправи'], ['/patient/notifications', `Сповіщення${unread ? ` (${unread})` : ''}`]] as const;
  return <div className="min-h-screen bg-background"><header className="border-b border-border bg-surface px-4 py-5 shadow-sm sm:px-6"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="workspace-mark" aria-hidden="true">R<span>·</span></div><div><p className="font-sans text-xl">REHAB<span className="font-normal text-text-secondary">MIS</span></p><p className="text-xs text-text-secondary">Ваш шлях до відновлення</p></div></div><form action={logoutStaff}><button type="submit" className="rc-btn rc-btn-ghost">Вийти</button></form></div><PatientNav links={links} /></header><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">{children}</main></div>;
}
async function loadUnreadCount() { try { const result = await serverApiFetch<{ count: number }>('/api/v1/patient-portal/notifications/unread-count'); return result.count; } catch { return 0; } }
