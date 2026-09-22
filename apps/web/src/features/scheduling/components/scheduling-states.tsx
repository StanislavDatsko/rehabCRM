import { Button } from '@repo/ui/button';
import { EmptyState, ErrorState } from '@repo/ui/components';
import { t } from '../../../i18n/messages';

export function SchedulingErrorState({ message }: { message: string }) {
  return (
    <ErrorState title={t('calendarErrorTitle')} description={message} />
  );
}

export function SchedulingForbiddenState() {
  return (
    <div role="alert" className="ui-surface px-5 py-8 text-sm">
      <p className="text-text-primary">{t('calendarForbidden')}</p>
    </div>
  );
}

export function SchedulingEmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <EmptyState title={t('calendarEmptyTitle')} description={t('calendarEmptyBody')} action={canCreate ? <a href="/app/calendar?create=1"><Button type="button">{t('calendarNewAppointment')}</Button></a> : undefined} />
  );
}
