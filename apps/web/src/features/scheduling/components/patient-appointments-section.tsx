import type { AppointmentCalendarItem, PatientAppointmentSummary } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { t } from '../../../i18n/messages';
import { buildPatientCalendarHref } from '../calendar-query';
import { formatSchedulingInstant } from '../timezone';
import { AppointmentStatusBadge } from './appointment-status-badge';

function AppointmentRow({ item, timezone }: { item: AppointmentCalendarItem; timezone: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-text-primary">{item.patient.displayName}</p>
        <p className="text-sm text-text-secondary">
          {formatSchedulingInstant(item.startsAt, timezone)}
          {item.appointmentType ? ` · ${item.appointmentType.name}` : ''}
        </p>
        <p className="text-sm text-text-secondary">{item.practitioner.displayName}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AppointmentStatusBadge status={item.status} />
        <a href={`/app/calendar?appointment=${item.id}`}>
          <Button type="button" variant="secondary">
            {t('appointmentOpen')}
          </Button>
        </a>
      </div>
    </div>
  );
}

export function PatientAppointmentsSection({
  patientId,
  summary,
  timezone,
  canCreate,
}: {
  patientId: string;
  summary: PatientAppointmentSummary;
  timezone: string;
  canCreate: boolean;
}) {
  return (
    <section className="rc-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionAppointments')}</h2>
        <div className="flex flex-wrap gap-2">
          <a href={`/app/calendar?patient=${patientId}`}>
            <Button type="button" variant="secondary">
              {t('patientAllAppointments')}
            </Button>
          </a>
          {canCreate ? (
            <a href={buildPatientCalendarHref(patientId)}>
              <Button type="button">{t('calendarNewAppointment')}</Button>
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-text-primary">{t('patientNextAppointment')}</h3>
          {summary.upcoming ? (
            <div className="mt-2">
              <AppointmentRow item={summary.upcoming} timezone={timezone} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">{t('patientNoUpcomingAppointment')}</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-text-primary">
            {t('patientRecentAppointments')}
          </h3>
          {summary.recent.length > 0 ? (
            <div className="mt-2 space-y-2">
              {summary.recent.map((item) => (
                <AppointmentRow key={item.id} item={item} timezone={timezone} />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">{t('patientNoRecentAppointments')}</p>
          )}
        </div>
      </div>
    </section>
  );
}
