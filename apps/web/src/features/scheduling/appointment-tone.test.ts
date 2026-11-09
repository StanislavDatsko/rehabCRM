import { describe, expect, it } from 'vitest';
import { appointmentTone } from './appointment-tone';

describe('appointmentTone', () => {
  it('is green for regular active appointments', () => {
    expect(appointmentTone({ status: 'SCHEDULED', rescheduledFromAt: null })).toBe('ok');
    expect(appointmentTone({ status: 'CONFIRMED', rescheduledFromAt: null })).toBe('ok');
  });

  it('is yellow for rescheduled appointments that are still active', () => {
    expect(appointmentTone({ status: 'SCHEDULED', rescheduledFromAt: '2026-11-09T10:00:00Z' })).toBe('moved');
  });

  it('is red for cancelled appointments, even if they were moved before', () => {
    expect(appointmentTone({ status: 'CANCELLED', rescheduledFromAt: '2026-11-09T10:00:00Z' })).toBe('cancelled');
  });

  it('is muted for completed visits', () => {
    expect(appointmentTone({ status: 'COMPLETED', rescheduledFromAt: null })).toBe('done');
  });
});
