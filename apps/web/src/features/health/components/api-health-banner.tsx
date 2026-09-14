export const dynamic = 'force-dynamic';

import { t } from '../../../i18n/messages';
import { fetchLiveHealth } from '../../../lib/api';

export async function ApiHealthBanner() {
  const health = await fetchLiveHealth();

  if (!health) {
    return (
      <p role="status" className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-text-secondary">
        {t('healthUnavailable')}
      </p>
    );
  }

  return (
    <p
      role="status"
      className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-primary"
    >
      {t('healthTitle')}: {t('healthLive')} — {health.status}
    </p>
  );
}
