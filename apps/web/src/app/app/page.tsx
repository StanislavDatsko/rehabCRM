import type { CurrentUserResponse } from '@repo/contracts';
import { t } from '../../i18n/messages';
import { serverApiFetch } from '../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function AppHomePage() {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');

  return (
    <>
      <h1 className="font-serif text-3xl text-text-primary">{t('appWelcome')}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">{t('appIntro')}</p>
      <dl className="mt-8 grid max-w-lg gap-4 text-sm">
        <div>
          <dt className="text-text-secondary">{t('labelOrganization')}</dt>
          <dd className="text-text-primary">{me.organization.name}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('labelStaff')}</dt>
          <dd className="text-text-primary">{me.displayName}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('labelRole')}</dt>
          <dd className="text-text-primary">{me.role}</dd>
        </div>
      </dl>
    </>
  );
}
