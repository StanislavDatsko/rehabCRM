'use client';

import type {
  AppointmentCalendarItem,
  AppointmentDetailResponse,
  ResponsiblePractitionerResponse,
  SchedulingCatalogResponse,
} from '@repo/contracts';
import type { CurrentUserResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useMemo, useState } from 'react';
import { t } from '../../../i18n/messages';
import type { CalendarQuery } from '../calendar-query';
import { buildCalendarHref } from '../calendar-query';
import { canCreateAppointment } from '../permissions';
import { apiInstantToCalendarDate } from '../timezone';
import { AppointmentCreateForm } from './appointment-create-form';
import { AppointmentDetailPanel } from './appointment-detail-panel';
import { SchedulingCalendar } from './scheduling-calendar';

export function CalendarPageClient({
  user,
  query,
  catalog,
  practitioners,
  items,
  timezone,
  selectedAppointment,
  flashMessage,
  prefillPatientId,
}: {
  user: CurrentUserResponse;
  query: CalendarQuery;
  catalog: SchedulingCatalogResponse;
  practitioners: ResponsiblePractitionerResponse[];
  items: AppointmentCalendarItem[];
  timezone: string;
  selectedAppointment: AppointmentDetailResponse | null;
  flashMessage: string | null;
  prefillPatientId: string;
}) {
  const [showCreate, setShowCreate] = useState(query.create);

  const events = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        title: `${item.patient.displayName}${item.appointmentType ? ` · ${item.appointmentType.name}` : ''}`,
        start: apiInstantToCalendarDate(item.startsAt, timezone),
        end: apiInstantToCalendarDate(item.endsAt, timezone),
        resource: item,
      })),
    [items, timezone],
  );

  const activePractitioners = practitioners.filter((p) => p.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {flashMessage ? (
        <div
          role="status"
          className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
        >
          {flashMessage}
        </div>
      ) : null}

      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">{t('calendarTitle')}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t('calendarSubtitle')}</p>
        </div>
        {canCreateAppointment(user) ? (
          <Button type="button" onClick={() => setShowCreate(true)}>
            {t('calendarNewAppointment')}
          </Button>
        ) : null}
      </header>

      <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <a href={buildCalendarHref(query, { date: query.date, view: 'day' })}>
            <Button type="button" variant={query.view === 'day' ? 'primary' : 'secondary'}>
              {t('calendarViewDay')}
            </Button>
          </a>
          <a href={buildCalendarHref(query, { date: query.date, view: 'week' })}>
            <Button type="button" variant={query.view === 'week' ? 'primary' : 'secondary'}>
              {t('calendarViewWeek')}
            </Button>
          </a>
        </div>

        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="view" value={query.view} />
          <input type="hidden" name="date" value={query.date} />
          <label className="text-xs font-medium text-text-secondary">
            {t('calendarFilterPractitioner')}
            <select
              name="practitioner"
              defaultValue={query.practitionerId}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('calendarFilterAll')}</option>
              {activePractitioners.map((practitioner) => (
                <option key={practitioner.id} value={practitioner.id}>
                  {practitioner.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-text-secondary">
            {t('calendarFilterLocation')}
            <select
              name="location"
              defaultValue={query.locationId}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('calendarFilterAll')}</option>
              {catalog.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="secondary">
              {t('calendarApplyFilters')}
            </Button>
          </div>
        </form>
      </div>

      <SchedulingCalendar
        view={query.view}
        date={query.date}
        timezone={timezone}
        events={events}
        query={query}
      />

      {selectedAppointment ? (
        <AppointmentDetailPanel
          user={user}
          appointment={selectedAppointment}
          practitioners={activePractitioners}
          timezone={timezone}
          closeHref={buildCalendarHref(query, { appointmentId: '' })}
        />
      ) : null}

      {showCreate ? (
        <AppointmentCreateForm
          catalog={catalog}
          practitioners={activePractitioners}
          timezone={timezone}
          prefillPatientId={prefillPatientId}
          onClose={() => setShowCreate(false)}
        />
      ) : null}
    </div>
  );
}
