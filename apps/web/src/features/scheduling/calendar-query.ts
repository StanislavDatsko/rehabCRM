import { todayCalendarDate } from './timezone';

export type CalendarView = 'day' | 'week';

export type CalendarQuery = {
  view: CalendarView;
  date: string;
  practitionerId: string;
  locationId: string;
  appointmentId: string;
  create: boolean;
};

const VIEW_SET = new Set<string>(['day', 'week']);

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseCalendarQuery(
  raw: Record<string, string | string[] | undefined>,
  timezone = 'Europe/Kyiv',
): CalendarQuery {
  const viewCandidate = firstString(raw.view).toLowerCase();
  const view: CalendarView = VIEW_SET.has(viewCandidate)
    ? (viewCandidate as CalendarView)
    : 'week';

  const dateCandidate = firstString(raw.date);
  const date = isCalendarDate(dateCandidate) ? dateCandidate : todayCalendarDate(timezone);

  const practitionerId = firstString(raw.practitioner).trim();
  const locationId = firstString(raw.location).trim();
  const appointmentId = firstString(raw.appointment).trim();
  const create = firstString(raw.create) === '1';

  return {
    view,
    date,
    practitionerId,
    locationId,
    appointmentId,
    create,
  };
}

export function calendarQueryToSearchParams(query: CalendarQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.view !== 'week') {
    params.set('view', query.view);
  }
  if (query.date) {
    params.set('date', query.date);
  }
  if (query.practitionerId) {
    params.set('practitioner', query.practitionerId);
  }
  if (query.locationId) {
    params.set('location', query.locationId);
  }
  if (query.appointmentId) {
    params.set('appointment', query.appointmentId);
  }
  if (query.create) {
    params.set('create', '1');
  }
  return params;
}

export function buildCalendarHref(
  query: CalendarQuery,
  overrides: Partial<CalendarQuery> = {},
): string {
  const merged: CalendarQuery = { ...query, ...overrides };
  if (overrides.create === false) {
    merged.create = false;
  }
  if (overrides.appointmentId === '') {
    merged.appointmentId = '';
  }
  const params = calendarQueryToSearchParams(merged);
  const qs = params.toString();
  return qs ? `/app/calendar?${qs}` : '/app/calendar';
}

export function buildPatientCalendarHref(patientId: string): string {
  return `/app/calendar?${new URLSearchParams({ patient: patientId, create: '1' }).toString()}`;
}
