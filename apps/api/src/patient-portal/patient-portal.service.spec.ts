import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { PatientPortalService } from './patient-portal.service';

const principal: AuthenticatedPrincipal = {
  subject: 'patient-sub', userId: 'user', organizationId: 'org', membershipId: 'membership', role: 'PATIENT', permissions: [],
  email: 'patient@example.invalid', displayName: 'Patient', organizationName: 'Clinic', patientId: 'patient-a', portalAccountId: 'portal-a',
};

function prismaFor(account: object | null) {
  return {
    patientPortalAccount: { findFirst: vi.fn().mockResolvedValue(account) },
    rehabilitationPlan: { findFirst: vi.fn() },
    measurement: { findMany: vi.fn() },
    rehabilitationGoal: { findMany: vi.fn() },
    patient: { findUnique: vi.fn() },
  };
}

describe('patient portal self-service boundary', () => {
  it.each([
    ['missing account', null],
    ['disabled account', null],
    ['wrong organization', null],
  ])('fails closed for %s', async (_name, account) => {
    const prisma = prismaFor(account);
    await expect(new PatientPortalService(prisma as never).me(principal)).rejects.toMatchObject({ status: 404 });
    await expect(new PatientPortalService(prisma as never).plan(principal)).rejects.toMatchObject({ status: 404 });
    await expect(new PatientPortalService(prisma as never).progress(principal)).rejects.toMatchObject({ status: 404 });
  });

  it('fails closed for a staff principal even if portal identifiers are present', async () => {
    await expect(new PatientPortalService(prismaFor(null) as never).me({ ...principal, role: 'REHABILITATION_SPECIALIST' })).rejects.toMatchObject({ status: 404 });
  });

  it('returns only the bound patient and organization projection', async () => {
    const prisma = prismaFor({ patientId: 'patient-a', organizationId: 'org', status: 'ACTIVE', patient: { firstName: 'Ada', lastName: 'Demo', dateOfBirth: new Date('1990-01-02'), internalReferenceNumber: 'DEV-1', organizationId: 'org' }, organization: { name: 'Clinic' } });
    const result = await new PatientPortalService(prisma as never).me(principal);
    expect(result).toEqual({ patient: { reference: 'DEV-1', firstName: 'Ada', lastName: 'Demo', dateOfBirth: '1990-01-02' }, portal: { status: 'ACTIVE' }, organization: { name: 'Clinic' } });
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('subject');
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('createdByUserId');
  });

  it('does not accept a caller-supplied patient id', () => {
    expect(new PatientPortalService(prismaFor(null) as never).plan.length).toBe(1);
    expect(new PatientPortalService(prismaFor(null) as never).progress.length).toBe(1);
  });

  it('returns null rather than exposing historical plans when there is no current plan', async () => {
    const prisma = prismaFor({ patientId: 'patient-a', organizationId: 'org' });
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(null);
    await expect(new PatientPortalService(prisma as never).plan(principal)).resolves.toBeNull();
    expect(prisma.rehabilitationPlan.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ patientId: 'patient-a', organizationId: 'org', status: { in: ['ACTIVE', 'PAUSED'] } }) }));
  });

  it('adapts the existing progress projection into a bounded patient DTO', async () => {
    const prisma = prismaFor({ patientId: 'patient-a', organizationId: 'org' });
    const progress = {
      measurements: vi.fn().mockResolvedValue({ series: [{ definition: { name: 'Pain' }, unit: 'POINTS', baseline: null, latest: null, deltaFromBaseline: 0, points: [] }] }),
      goals: vi.fn().mockResolvedValue({ goals: [{ id: 'internal-goal', planId: 'internal-plan', planRevisionId: 'internal-revision', planRevisionNumber: 1, title: 'Walk', status: 'IN_PROGRESS' }] }),
      summary: vi.fn().mockResolvedValue({ counts: { activeGoals: 1 }, currentPlan: null, latestClinicalActivityAt: null }),
    };
    const result = await new PatientPortalService(prisma as never, progress as never).progress(principal);
    expect(progress.measurements).toHaveBeenCalledWith(principal, 'patient-a', { period: '90d' });
    expect(result).toEqual({ measurements: [expect.objectContaining({ definition: 'Pain' })], goals: [{ title: 'Walk', status: 'IN_PROGRESS' }], summary: expect.objectContaining({ counts: { activeGoals: 1 } }) });
    expect(JSON.stringify(result)).not.toContain('internal-goal');
  });
});
