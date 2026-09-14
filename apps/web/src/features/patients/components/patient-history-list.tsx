import type { PatientHistoryItem } from '@repo/contracts';
import { t } from '../../../i18n/messages';
import { patientHistoryActionLabel } from '../labels';

function formatOccurredAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return t('patientNoValue');
  }
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function PatientHistoryList({ items }: { items: PatientHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-text-secondary">{t('patientHistoryEmpty')}</p>
    );
  }

  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="border-l-2 border-border pl-4">
          <p className="text-sm font-medium text-text-primary">
            {patientHistoryActionLabel(item)}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {formatOccurredAt(item.occurredAt)} · {t('patientHistoryBy')}: {item.actor.displayName}
          </p>
          {item.changedFields.length > 0 ? (
            <p className="mt-1 text-xs text-text-secondary">
              {t('patientHistoryFields')}: {item.changedFields.join(', ')}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
