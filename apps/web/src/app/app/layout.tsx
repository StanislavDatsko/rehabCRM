import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { StaffShell } from '../../features/shell/staff-shell';
import { loadCurrentUser } from '../../lib/app/load-current-user';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') {
    redirect('/login?reason=expired');
  }
  if (me === 'denied') {
    redirect('/login?reason=denied');
  }

  return <StaffShell user={me}>{children}</StaffShell>;
}
