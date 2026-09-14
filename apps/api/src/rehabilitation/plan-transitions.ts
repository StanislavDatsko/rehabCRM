import type { RehabilitationPlanStatus } from '@prisma/client';

const ALLOWED: Readonly<Record<RehabilitationPlanStatus, readonly RehabilitationPlanStatus[]>> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionPlan(
  from: RehabilitationPlanStatus,
  to: RehabilitationPlanStatus,
): boolean {
  return ALLOWED[from].includes(to);
}
