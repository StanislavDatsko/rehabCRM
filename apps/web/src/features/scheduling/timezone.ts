import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Europe/Kyiv';

const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function resolveDisplayTimezone(locationTimezone: string | null | undefined): string {
  if (locationTimezone && isValidTimezone(locationTimezone)) {
    return locationTimezone;
  }
  return DEFAULT_TIMEZONE;
}

export function todayCalendarDate(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
}

export function parseCalendarDate(value: string, timezone: string): Date {
  const match = CALENDAR_DATE_RE.exec(value);
  if (!match) {
    return toZonedTime(new Date(), timezone);
  }
  const [, year, month, day] = match;
  const local = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  return toZonedTime(local, timezone);
}

export function formatCalendarDate(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

export function calendarQueryRange(
  view: 'day' | 'week' | 'month',
  anchor: Date,
  timezone: string,
): { from: string; to: string } {
  const zoned = toZonedTime(anchor, timezone);
  // Month view renders whole weeks, so the window covers the visible grid.
  const rangeStart =
    view === 'day'
      ? startOfDay(zoned)
      : view === 'week'
        ? startOfWeek(zoned, { weekStartsOn: 1 })
        : startOfWeek(startOfMonth(zoned), { weekStartsOn: 1 });
  const rangeEnd =
    view === 'day'
      ? endOfDay(zoned)
      : view === 'week'
        ? endOfWeek(zoned, { weekStartsOn: 1 })
        : endOfWeek(endOfMonth(zoned), { weekStartsOn: 1 });
  return {
    from: fromZonedTime(rangeStart, timezone).toISOString(),
    to: fromZonedTime(rangeEnd, timezone).toISOString(),
  };
}

export function apiInstantToCalendarDate(iso: string, timezone: string): Date {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) {
    return toZonedTime(new Date(), timezone);
  }
  return toZonedTime(parsed, timezone);
}

export function formatSchedulingInstant(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(iso));
}

export function formatSchedulingTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(iso));
}

export function combineDateAndTimeToIso(
  dateYmd: string,
  timeHm: string,
  timezone: string,
): string {
  const match = CALENDAR_DATE_RE.exec(dateYmd);
  const [hours, minutes] = timeHm.split(':').map(Number);
  if (!match || !Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error('Некоректна дата чи час');
  }
  const [, year, month, day] = match;
  const local = new Date(Number(year), Number(month) - 1, Number(day), hours, minutes, 0);
  return fromZonedTime(local, timezone).toISOString();
}

export function addMinutesToIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/** Exact calendar week (Mon–Sun) or month containing the anchor, for totals. */
export function periodRange(
  period: 'week' | 'month',
  anchor: Date,
  timezone: string,
): { from: string; to: string } {
  const zoned = toZonedTime(anchor, timezone);
  const start =
    period === 'week' ? startOfWeek(zoned, { weekStartsOn: 1 }) : startOfMonth(zoned);
  const end = period === 'week' ? endOfWeek(zoned, { weekStartsOn: 1 }) : endOfMonth(zoned);
  return {
    from: fromZonedTime(start, timezone).toISOString(),
    to: fromZonedTime(end, timezone).toISOString(),
  };
}

/** Local calendar date and time (yyyy-MM-dd / HH:mm) of an instant in a timezone. */
export function instantToLocalParts(
  iso: string,
  timezone: string,
): { date: string; time: string } {
  return {
    date: formatInTimeZone(new Date(iso), timezone, 'yyyy-MM-dd'),
    time: formatInTimeZone(new Date(iso), timezone, 'HH:mm'),
  };
}
