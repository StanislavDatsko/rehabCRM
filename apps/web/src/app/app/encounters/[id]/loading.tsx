import { t } from '../../../../i18n/messages';

export default function EncounterLoading() {
  return (
    <div className="space-y-5" role="status" aria-busy="true" aria-live="polite">
      <div className="ui-skeleton h-9 w-72" />
      <div className="ui-skeleton h-28 w-full" />
      <div className="ui-skeleton h-96 w-full" />
      <span className="sr-only">{t('encounterLoading')}</span>
    </div>
  );
}
