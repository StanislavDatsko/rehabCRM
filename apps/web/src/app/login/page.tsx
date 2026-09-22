import { AuthLayout } from '../../features/auth/auth-layout';
import { redirect } from 'next/navigation';
import { LoginForm } from '../../features/auth/login-form';
import { logoutStaff } from '../../features/auth/actions';
import { serverApiFetch } from '../../lib/api/server-api-client';
import { t } from '../../i18n/messages';
import { safeReturnTo } from '../../lib/auth/safe-return-to';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; error?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  let session: { id: string } | null = null;
  try {
    session = await serverApiFetch<{ id: string }>('/api/v1/auth/me');
  } catch {
    session = null;
  }
  const reason = params.reason;
  if (session && reason !== 'denied' && !params.error) redirect('/app');
  let message = t('loginHint');
  if (reason === 'expired') {
    message = t('sessionExpired');
  } else if (reason === 'denied' || params.error) {
    message = t('loginDenied');
  }

  return <AuthLayout title="Вітаємо знову" description={message}>
    <LoginForm returnTo={safeReturnTo(params.returnTo)} />
    {session && (reason === 'denied' || params.error) ? <form action={logoutStaff} className="mt-4"><button type="submit" className="rc-btn rc-btn-secondary">Вийти</button></form> : null}
  </AuthLayout>;
}
