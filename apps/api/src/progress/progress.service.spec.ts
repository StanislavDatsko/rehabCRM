import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { ProgressService } from './progress.service';

const principal: AuthenticatedPrincipal = {
  subject: 'sub', userId: '00000000-0000-4000-8000-000000000001', organizationId: '00000000-0000-4000-8000-000000000002', membershipId: 'm', role: 'REHABILITATION_SPECIALIST', permissions: [], email: 'specialist@example.invalid', displayName: 'Specialist', organizationName: 'Clinic',
};

describe('progress read projection', () => {
  it('computes a target condition without mutating goal status', async () => {
    const prisma = {
      patient: { findFirst: vi.fn().mockResolvedValue({ createdAt: new Date('2026-01-01') }) },
      rehabilitationPlan: {
        findFirst: vi.fn().mockResolvedValue({ id: 'plan', status: 'ACTIVE', currentRevision: { startDate: new Date('2026-08-01'), title: 'Plan', revisionNumber: 1 } }),
        findMany: vi.fn().mockResolvedValue([{ id: 'plan', currentRevision: { id: 'revision', revisionNumber: 1, goals: [{ id: 'goal', title: 'Pain', status: 'IN_PROGRESS', anatomicalRegionCode: 'knee', laterality: 'LEFT', measurementDefinitionId: 'definition', targetOperator: 'LESS_THAN_OR_EQUAL', targetValue: 2, targetValueUpper: null, targetUnitCode: null, baselineNumericValueSnapshot: 6, baselineUnitCodeSnapshot: null, baselinePerformedAt: new Date('2026-08-01') }] } }]),
      },
      measurement: { findFirst: vi.fn().mockResolvedValue({ id: 'measurement', numericValue: 2, unitCodeSnapshot: null, performedAt: new Date('2026-09-01') }) },
    };
    const result = await new ProgressService(prisma as never).goals(principal, 'patient', { period: '90d' });
    expect(result.goals[0]).toMatchObject({ status: 'IN_PROGRESS', targetConditionMet: true });
    expect(prisma.measurement.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assessment: { status: 'COMPLETED', voidedAt: null } }) }));
    expect(Object.hasOwn(prisma, 'rehabilitationGoal')).toBe(false);
  });

  it('does not query clinical sources when the patient is outside the organization', async () => {
    const prisma = { patient: { findFirst: vi.fn().mockResolvedValue(null) }, encounter: { findMany: vi.fn() } };
    await expect(new ProgressService(prisma as never).timeline(principal, 'foreign-patient', { page: 1, pageSize: 25 })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'PROGRESS_NOT_FOUND' }) });
    expect(prisma.encounter.findMany).not.toHaveBeenCalled();
  });
});
