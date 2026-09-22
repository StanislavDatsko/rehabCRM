import { t } from '../../../i18n/messages';

export default function CalendarLoading() {
  return (
    <div className="space-y-5" role="status" aria-busy="true" aria-live="polite">
      <div className="ui-skeleton h-9 w-56" />
      <div className="ui-skeleton h-16 w-full" />
      <div className="ui-skeleton h-[640px] w-full" />
      <span className="sr-only">{t('calendarLoading')}</span>
    </div>
  );
}
