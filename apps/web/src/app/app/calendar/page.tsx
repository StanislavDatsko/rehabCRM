import type { CurrentUserResponse } from '@repo/contracts';
import { CalendarPageClient } from '../../../features/scheduling/components/calendar-page-client';
import { SchedulingErrorState, SchedulingForbiddenState } from '../../../features/scheduling/components/scheduling-states';
import {
  getAppointment,
  getSchedulingCatalog,
  listAppointments,
} from '../../../features/scheduling/api/scheduling-api';
import { listResponsiblePractitioners } from '../../../features/patients/api/patients-api';
import { parseCalendarQuery } from '../../../features/scheduling/calendar-query';
import { mapSchedulingErrorToMessage } from '../../../features/scheduling/labels';
import { canReadAppointments } from '../../../features/scheduling/permissions';
import {
  calendarQueryRange,
  parseCalendarDate,
  resolveDisplayTimezone,
} from '../../../features/scheduling/timezone';
import { t } from '../../../i18n/messages';
import { ServerApiError, serverApiFetch } from '../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

/*
  Calendar UI uses react-big-calendar (MIT) with date-fns localizer — chosen over
  FullCalendar for smaller bundle, day/week views, and stack alignment. See
  scheduling-calendar.tsx for event rendering; native grid avoided for a11y toolbar.
*/

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadAppointments(me)) {
    return (
      <div className="space-y-4">
        <h1 className="font-sans text-3xl text-text-primary">{t('calendarTitle')}</h1>
        <SchedulingForbiddenState />
      </div>
    );
  }

  const raw = await searchParams;

  let catalog: Awaited<ReturnType<typeof getSchedulingCatalog>>;
  try {
    catalog = await getSchedulingCatalog();
  } catch (error) {
    const message =
      error instanceof ServerApiError
        ? mapSchedulingErrorToMessage(error.body?.code)
        : mapSchedulingErrorToMessage(undefined);
    return (
      <div className="space-y-4">
        <h1 className="font-sans text-3xl text-text-primary">{t('calendarTitle')}</h1>
        <SchedulingErrorState message={message} />
      </div>
    );
  }

  const locationId = Array.isArray(raw.location) ? raw.location[0] : raw.location;
  const locationTimezone = catalog.locations.find((loc) => loc.id === locationId)?.timezone;
  const timezone = resolveDisplayTimezone(locationTimezone);
  const query = parseCalendarQuery(raw, timezone);
  const anchor = parseCalendarDate(query.date, timezone);
  const range = calendarQueryRange(query.view, anchor, timezone);

  let items: Awaited<ReturnType<typeof listAppointments>>['items'] = [];
  try {
    const response = await listAppointments({
      from: range.from,
      to: range.to,
      practitionerId: query.practitionerId || undefined,
      locationId: query.locationId || undefined,
      patientId: typeof raw.patient === 'string' ? raw.patient : undefined,
    });
    items = response.items;
  } catch (error) {
    const message =
      error instanceof ServerApiError
        ? mapSchedulingErrorToMessage(error.body?.code)
        : mapSchedulingErrorToMessage(undefined);
    return (
      <div className="space-y-4">
        <h1 className="font-sans text-3xl text-text-primary">{t('calendarTitle')}</h1>
        <SchedulingErrorState message={message} />
      </div>
    );
  }

  let practitioners: Awaited<ReturnType<typeof listResponsiblePractitioners>> = [];
  try {
    practitioners = await listResponsiblePractitioners();
  } catch {
    practitioners = [];
  }

  let selectedAppointment: Awaited<ReturnType<typeof getAppointment>> | null = null;
  if (query.appointmentId) {
    try {
      selectedAppointment = await getAppointment(query.appointmentId);
    } catch {
      selectedAppointment = null;
    }
  }

  const flashMessage = raw.created
    ? t('appointmentCreatedFlash')
    : raw.updated
      ? t('appointmentUpdatedFlash')
      : raw.statusUpdated
        ? t('appointmentStatusUpdatedFlash')
        : null;

  const prefillPatientId = typeof raw.patient === 'string' ? raw.patient : '';

  return (
    <CalendarPageClient
      user={me}
      query={query}
      catalog={catalog}
      practitioners={practitioners}
      items={items}
      timezone={timezone}
      selectedAppointment={selectedAppointment}
      flashMessage={flashMessage}
      prefillPatientId={prefillPatientId}
    />
  );
}
