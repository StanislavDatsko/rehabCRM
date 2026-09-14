import type { AppointmentStatus } from '@repo/contracts';
import { appointmentStatusLabel } from '../labels';

const statusClass: Record<AppointmentStatus, string> = {
  SCHEDULED: 'border-info/40 bg-info/10 text-info',
  CONFIRMED: 'border-success/40 bg-success/10 text-success',
  CHECKED_IN: 'border-warning/40 bg-warning/10 text-warning',
  IN_PROGRESS: 'border-info/40 bg-info/10 text-info',
  COMPLETED: 'border-border bg-surface-muted text-text-secondary',
  CANCELLED: 'border-danger/40 bg-danger/10 text-danger',
  NO_SHOW: 'border-danger/40 bg-danger/10 text-danger',
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const label = appointmentStatusLabel(status);
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusClass[status]}`}
      aria-label={label}
    >
      {label}
    </span>
  );
}
