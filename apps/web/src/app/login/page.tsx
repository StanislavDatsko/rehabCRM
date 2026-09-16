import { redirect } from 'next/navigation';
import { LoginForm } from '../../features/auth/login-form';
import { auth } from '../../lib/auth/server';
import { t } from '../../i18n/messages';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { data: session } = await auth.getSession();
  if (session?.user) redirect('/app');
  const reason = params.reason;
  let message = t('loginHint');
  if (reason === 'expired') {
    message = t('sessionExpired');
  } else if (reason === 'denied' || params.error) {
    message = t('loginDenied');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <main
        id="main"
        className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-md lg:grid-cols-[1.05fr_.95fr]"
      >
        <section className="rc-gradient-brand relative hidden min-h-[520px] overflow-hidden p-10 text-white lg:block"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[36px] border-white/10" /><div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-lime/20 blur-2xl" /><div className="relative flex h-full flex-col justify-between"><div><div className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur">R</div><p className="text-sm font-medium tracking-wide text-white/75">REHABILITATION INTELLIGENCE</p><h1 className="mt-4 max-w-sm font-serif text-5xl leading-tight">Відновлення, яке видно.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-white/75">Єдиний простір для команди клініки та кожного кроку пацієнта.</p></div><div className="flex items-center gap-3 text-sm text-white/80"><span className="h-2 w-2 rounded-full bg-brand-lime" /> Безпечна медична платформа</div></div></section>
        <section className="p-8 sm:p-12"><div className="mb-10 flex items-center gap-3 lg:hidden"><div className="rc-gradient-brand flex h-11 w-11 items-center justify-center rounded-xl font-bold text-white">R</div><p className="font-serif text-2xl">{t('productName')}</p></div><p className="rc-kicker">Secure workspace</p><p className="mt-3 font-serif text-4xl text-text-primary">{t('productName')}</p><p className="mt-2 text-sm text-text-secondary">{t('tagline')}</p><p className="mt-8 text-sm leading-6 text-text-secondary">{t('staffOnly')}</p><p className="mt-4 text-sm leading-6 text-text-secondary">{message}</p>{reason === 'denied' || params.error ? <p role="alert" className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{t('loginDenied')}</p> : null}<div className="mt-8"><LoginForm /></div><p className="mt-6 text-xs text-text-secondary">{t('notDiagnostic')}</p></section>
      </main>
    </div>
  );
}
