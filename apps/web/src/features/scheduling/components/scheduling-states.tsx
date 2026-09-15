import { Button } from '@repo/ui/button';
import { t } from '../../../i18n/messages';

export function SchedulingErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/10 px-5 py-6 text-sm text-danger shadow-sm"
    >
      <p className="font-semibold">{t('calendarErrorTitle')}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

export function SchedulingForbiddenState() {
  return (
    <div role="alert" className="rc-card px-5 py-8 text-sm">
      <p className="text-text-primary">{t('calendarForbidden')}</p>
    </div>
  );
}

export function SchedulingEmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="rc-card border-dashed px-6 py-10 text-center">
      <h2 className="font-serif text-xl text-text-primary">{t('calendarEmptyTitle')}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">{t('calendarEmptyBody')}</p>
      {canCreate ? (
        <div className="mt-6">
          <a href="/app/calendar?create=1">
            <Button type="button">{t('calendarNewAppointment')}</Button>
          </a>
        </div>
      ) : null}
    </div>
  );
}
