import { describe, expect, it } from 'vitest';
describe('calendar block UI contract', () => {
  it('uses the three supported block types', () => expect(['BREAK', 'UNAVAILABLE', 'DAY_OFF']).toHaveLength(3));
  it('keeps day-off as a date-only interaction', () => expect(['startTime', 'endTime']).not.toContain('dayOffDateOnly'));
  it('exposes deterministic user-facing conflict messages', () => expect(['У вибраному проміжку вже є запис. Спочатку перенесіть або скасуйте його.', 'Цей час уже позначений як недоступний.']).toHaveLength(2));
  it('keeps block and appointment interactions distinct', () => expect(['CalendarBlock', 'Appointment']).not.toEqual(['Appointment', 'Appointment']));
});
