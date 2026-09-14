import { t } from '../../../../i18n/messages';

export default function EncounterLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl text-text-primary">{t('encounterTitle')}</h1>
      <p className="text-sm text-text-secondary">{t('encounterLoading')}</p>
    </div>
  );
}
