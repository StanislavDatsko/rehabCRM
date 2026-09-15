import type { CurrentUserResponse } from '@repo/contracts';
import { t } from '../../i18n/messages';
import { serverApiFetch } from '../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function AppHomePage() {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');

  return <div className="space-y-8">
    <section className="rc-gradient-brand rounded-2xl p-8 text-white shadow-brand lg:p-10"><p className="text-xs font-bold uppercase tracking-[.16em] text-white/70">Today at a glance</p><h1 className="mt-3 font-serif text-4xl">{t('appWelcome')}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{t('appIntro')}</p></section>
    <dl className="grid gap-4 sm:grid-cols-3"><div className="rc-card p-5"><dt className="rc-kicker">{t('labelOrganization')}</dt><dd className="mt-2 text-lg font-semibold text-text-primary">{me.organization.name}</dd></div><div className="rc-card p-5"><dt className="rc-kicker">{t('labelStaff')}</dt><dd className="mt-2 text-lg font-semibold text-text-primary">{me.displayName}</dd></div><div className="rc-card p-5"><dt className="rc-kicker">{t('labelRole')}</dt><dd className="mt-2 text-lg font-semibold text-info">{me.role}</dd></div></dl>
  </div>;
}
