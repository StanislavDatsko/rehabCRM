import type { AppointmentCalendarItem } from '@repo/contracts';

/**
 * Visual state of an appointment in the calendar:
 * - ok: active appointment (green)
 * - moved: was rescheduled to this time (yellow)
 * - cancelled: cancelled or patient did not show (red)
 * - done: completed visit (muted)
 */
export type AppointmentTone = 'ok' | 'moved' | 'cancelled' | 'done';

export function appointmentTone(
  item: Pick<AppointmentCalendarItem, 'status' | 'rescheduledFromAt'>,
): AppointmentTone {
  if (item.status === 'CANCELLED' || item.status === 'NO_SHOW') return 'cancelled';
  if (item.status === 'COMPLETED') return 'done';
  if (item.rescheduledFromAt) return 'moved';
  return 'ok';
}
