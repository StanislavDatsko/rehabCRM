import { describe, expect, it } from 'vitest';
import { buildCalendarHref, parseCalendarQuery } from './calendar-query';

describe('parseCalendarQuery', () => {
  it('applies defaults for view and date', () => {
    const parsed = parseCalendarQuery({}, 'Europe/Kyiv');
    expect(parsed.view).toBe('week');
    expect(parsed.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.practitionerId).toBe('');
    expect(parsed.locationId).toBe('');
    expect(parsed.appointmentId).toBe('');
    expect(parsed.create).toBe(false);
  });

  it('whitelists view and parses filters', () => {
    const parsed = parseCalendarQuery(
      {
        view: 'day',
        date: '2026-09-02',
        practitioner: 'prac-1',
        location: 'loc-1',
        appointment: 'appt-1',
        create: '1',
      },
      'Europe/Kyiv',
    );
    expect(parsed).toEqual({
      view: 'day',
      date: '2026-09-02',
      practitionerId: 'prac-1',
      locationId: 'loc-1',
      appointmentId: 'appt-1',
      create: true,
    });
  });

  it('ignores invalid view and date values', () => {
    const parsed = parseCalendarQuery(
      { view: 'month', date: 'not-a-date' },
      'Europe/Kyiv',
    );
    expect(parsed.view).toBe('week');
    expect(parsed.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('buildCalendarHref', () => {
  it('serializes calendar URL state', () => {
    const href = buildCalendarHref({
      view: 'day',
      date: '2026-09-02',
      practitionerId: 'prac-1',
      locationId: '',
      appointmentId: 'appt-1',
      create: false,
    });
    expect(href).toContain('/app/calendar?');
    expect(href).toContain('view=day');
    expect(href).toContain('date=2026-09-02');
    expect(href).toContain('practitioner=prac-1');
    expect(href).toContain('appointment=appt-1');
  });
});
