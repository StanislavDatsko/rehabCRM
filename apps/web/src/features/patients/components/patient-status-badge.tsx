import type { PatientStatus } from '@repo/contracts';
import { patientStatusLabel } from '../labels';
import { StatusPill } from '@repo/ui/workspace';

const tones = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  COMPLETED: 'info',
  ARCHIVED: 'neutral',
} as const;

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  const label = patientStatusLabel(status);
  return (
    <StatusPill tone={tones[status]}>{label}</StatusPill>
  );
}
