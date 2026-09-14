import { LoginButton } from '../../features/auth/login-button';
import { t } from '../../i18n/messages';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; error?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason;
  let message = t('loginHint');
  if (reason === 'expired') {
    message = t('sessionExpired');
  } else if (reason === 'denied' || params.error) {
    message = t('loginDenied');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <main
        id="main"
        className="w-full max-w-md rounded-md border border-border bg-surface p-8 shadow-sm"
      >
        <p className="font-serif text-3xl text-text-primary">{t('productName')}</p>
        <p className="mt-2 text-sm text-text-secondary">{t('tagline')}</p>
        <p className="mt-6 text-sm leading-6 text-text-secondary">{t('staffOnly')}</p>
        <p className="mt-4 text-sm leading-6 text-text-secondary">{message}</p>
        {reason === 'denied' || params.error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {t('loginDenied')}
          </p>
        ) : null}
        <div className="mt-8">
          <LoginButton />
        </div>
        <p className="mt-6 text-xs text-text-secondary">{t('notDiagnostic')}</p>
      </main>
    </div>
  );
}
