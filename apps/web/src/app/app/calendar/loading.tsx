import { t } from '../../../i18n/messages';

export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl text-text-primary">{t('calendarTitle')}</h1>
      <p className="text-sm text-text-secondary">{t('calendarLoading')}</p>
    </div>
  );
}
