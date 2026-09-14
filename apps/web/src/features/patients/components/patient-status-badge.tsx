import type { PatientStatus } from '@repo/contracts';
import { patientStatusLabel } from '../labels';

const statusClass: Record<PatientStatus, string> = {
  ACTIVE: 'border-success/40 bg-success/10 text-success',
  INACTIVE: 'border-warning/40 bg-warning/10 text-warning',
  COMPLETED: 'border-info/40 bg-info/10 text-info',
  ARCHIVED: 'border-border bg-surface-muted text-text-secondary',
};

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  const label = patientStatusLabel(status);
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusClass[status]}`}
    >
      {label}
    </span>
  );
}
