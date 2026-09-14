import { canTransitionAppointment } from './appointment-transitions';
import type { AppointmentStatus } from '@repo/contracts';
import { describe, expect, it } from 'vitest';

describe('canTransitionAppointment', () => {
  const allowed: [AppointmentStatus, AppointmentStatus][] = [
    ['SCHEDULED', 'CONFIRMED'],
    ['SCHEDULED', 'CHECKED_IN'],
    ['SCHEDULED', 'CANCELLED'],
    ['SCHEDULED', 'NO_SHOW'],
    ['CONFIRMED', 'CHECKED_IN'],
    ['CONFIRMED', 'CANCELLED'],
    ['CONFIRMED', 'NO_SHOW'],
    ['CHECKED_IN', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'COMPLETED'],
  ];

  it.each(allowed)('allows %s -> %s', (from, to) => {
    expect(canTransitionAppointment(from, to)).toBe(true);
  });

  const rejected: [AppointmentStatus, AppointmentStatus][] = [
    ['COMPLETED', 'CANCELLED'],
    ['CANCELLED', 'CHECKED_IN'],
    ['NO_SHOW', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'CHECKED_IN'],
    ['SCHEDULED', 'COMPLETED'],
    ['CONFIRMED', 'IN_PROGRESS'],
  ];

  it.each(rejected)('rejects %s -> %s', (from, to) => {
    expect(canTransitionAppointment(from, to)).toBe(false);
  });

  it('rejects transitions from terminal states', () => {
    for (const from of ['COMPLETED', 'CANCELLED', 'NO_SHOW'] as const) {
      expect(canTransitionAppointment(from, 'SCHEDULED')).toBe(false);
      expect(canTransitionAppointment(from, 'CHECKED_IN')).toBe(false);
    }
  });
});
