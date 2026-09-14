import { t } from '../../../i18n/messages';

export default function PatientsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-9 w-48 animate-pulse rounded bg-surface-muted" />
      <p className="text-sm text-text-secondary">{t('patientsLoading')}</p>
      <div className="h-40 animate-pulse rounded-md border border-border bg-surface" />
      <div className="h-64 animate-pulse rounded-md border border-border bg-surface" />
    </div>
  );
}
