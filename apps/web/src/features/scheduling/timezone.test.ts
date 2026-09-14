import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIMEZONE,
  calendarQueryRange,
  combineDateAndTimeToIso,
  formatCalendarDate,
  isValidTimezone,
  parseCalendarDate,
  resolveDisplayTimezone,
} from './timezone';

describe('scheduling timezone helpers', () => {
  it('validates and resolves display timezone', () => {
    expect(isValidTimezone('Europe/Kyiv')).toBe(true);
    expect(isValidTimezone('Not/AZone')).toBe(false);
    expect(resolveDisplayTimezone('Europe/Kyiv')).toBe('Europe/Kyiv');
    expect(resolveDisplayTimezone('bad')).toBe(DEFAULT_TIMEZONE);
    expect(resolveDisplayTimezone(null)).toBe(DEFAULT_TIMEZONE);
  });

  it('parses and formats calendar dates in a timezone', () => {
    const parsed = parseCalendarDate('2026-09-02', 'Europe/Kyiv');
    expect(formatCalendarDate(parsed, 'Europe/Kyiv')).toBe('2026-09-02');
  });

  it('builds bounded ISO ranges for day and week views', () => {
    const anchor = parseCalendarDate('2026-09-02', 'Europe/Kyiv');
    const day = calendarQueryRange('day', anchor, 'Europe/Kyiv');
    const week = calendarQueryRange('week', anchor, 'Europe/Kyiv');
    expect(day.from < day.to).toBe(true);
    expect(week.from < week.to).toBe(true);
    expect(new Date(week.to).getTime() - new Date(week.from).getTime()).toBeLessThanOrEqual(
      7 * 24 * 60 * 60 * 1000 + 1000,
    );
  });

  it('combines local date and time into UTC ISO', () => {
    const iso = combineDateAndTimeToIso('2026-09-02', '14:30', 'Europe/Kyiv');
    expect(iso).toMatch(/2026-09-02T11:30:00\.000Z/);
  });
});
