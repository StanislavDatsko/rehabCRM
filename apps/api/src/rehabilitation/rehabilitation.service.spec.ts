import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { RehabilitationService } from './rehabilitation.service';

const principal: AuthenticatedPrincipal = {
  subject: 'sub',
  userId: 'user-1',
  organizationId: 'org-1',
  membershipId: 'membership-1',
  role: 'REHABILITATION_SPECIALIST',
  permissions: [],
  email: 'specialist@example.invalid',
  displayName: 'Specialist',
  organizationName: 'Org',
};

const now = new Date('2026-09-02T10:00:00.000Z');
function revision(status: 'DRAFT' | 'PUBLISHED', overrides: Record<string, unknown> = {}) {
  return {
    id: status === 'DRAFT' ? 'draft-1' : 'published-1',
    organizationId: 'org-1',
    planId: 'plan-1',
    basedOnRevisionId: null,
    revisionNumber: 1,
    status,
    title: 'План',
    description: null,
    startDate: now,
    expectedEndDate: null,
    effectiveFrom: status === 'PUBLISHED' ? now : null,
    changeSummary: null,
    createdByUserId: 'user-1',
    createdAt: now,
    createdBy: { id: 'user-1', displayName: 'Specialist' },
    goals: [],
    phases: [],
    prescriptions: [],
    ...overrides,
  };
}

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-1',
    organizationId: 'org-1',
    patientId: 'patient-1',
    responsiblePractitionerId: 'practitioner-1',
    status: 'DRAFT',
    currentRevisionId: null,
    cancellationReason: null,
    cancelledAt: null,
    cancelledByUserId: null,
    version: 1,
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdAt: now,
    updatedAt: now,
    patient: { id: 'patient-1', firstName: 'Іван', lastName: 'Коваленко', middleName: null },
    responsiblePractitioner: { id: 'practitioner-1', user: { displayName: 'Specialist' } },
    revisions: [revision('DRAFT')],
    ...overrides,
  };
}

function createPrismaMock() {
  const tx = {
    rehabilitationPlan: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    rehabilitationPlanRevision: { update: vi.fn(), create: vi.fn() },
    rehabilitationPlanPhase: { deleteMany: vi.fn(), createMany: vi.fn() },
    rehabilitationGoal: { deleteMany: vi.fn(), createMany: vi.fn() },
    exercisePrescription: { deleteMany: vi.fn(), createMany: vi.fn() },
    exerciseDefinition: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    measurementDefinition: { findMany: vi.fn() },
    measurement: { findFirst: vi.fn() },
    patient: { findFirst: vi.fn() },
    practitioner: { findFirst: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
  return {
    ...tx,
    $transaction: vi.fn(async (fn: (transaction: never) => unknown) => fn(tx as never)),
  };
}

describe('RehabilitationService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: RehabilitationService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new RehabilitationService(prisma as never);
  });

  it('conceals a cross-organization plan GET as 404', async () => {
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(null);
    await expect(service.getPlan(principal, 'foreign-plan')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.rehabilitationPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-plan', organizationId: 'org-1' },
      }),
    );
  });

  it('conceals a cross-organization patient plan list as 404', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.listPlans(principal, 'foreign-patient')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.rehabilitationPlan.findMany).not.toHaveBeenCalled();
  });

  it('uses the authenticated specialist practitioner when creating a plan', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    prisma.practitioner.findFirst.mockResolvedValue({ id: 'practitioner-1' });
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(plan());
    const response = await service.createPlan(
      principal,
      'patient-1',
      { title: 'План', startDate: '2026-09-02' },
      'request',
    );
    expect(response.status).toBe('DRAFT');
    expect(prisma.rehabilitationPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId: 'patient-1',
        organizationId: 'org-1',
        responsiblePractitionerId: 'practitioner-1',
      }),
    });
  });

  it('scopes exercise search to shared and current-organization definitions', async () => {
    prisma.exerciseDefinition.count.mockResolvedValue(0);
    prisma.exerciseDefinition.findMany.mockResolvedValue([]);
    await service.listExercises(principal, { search: 'коліно' });
    expect(prisma.exerciseDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ organizationId: null }, { organizationId: 'org-1' }],
          active: true,
        }),
        take: 20,
      }),
    );
  });

  it('does not allow direct aggregate editing of a published active revision', async () => {
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(
      plan({
        status: 'ACTIVE',
        currentRevisionId: 'published-1',
        revisions: [revision('PUBLISHED')],
      }),
    );
    await expect(
      service.updatePlan(
        principal,
        'plan-1',
        {
          version: 1,
          revisionId: 'published-1',
          title: 'Змінений план',
          startDate: '2026-09-02',
          goals: [],
          phases: [],
          exercisePrescriptions: [],
        },
        'request',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns a concurrency conflict before publishing or auditing a stale activation', async () => {
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(
      plan({
        revisions: [revision('DRAFT', { goals: [{ id: 'goal-1' }], prescriptions: [] })],
      }),
    );
    prisma.rehabilitationPlan.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.activate(principal, 'plan-1', { version: 1 }, 'request'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.rehabilitationPlanRevision.update).not.toHaveBeenCalled();
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('does not treat PAUSED -> ACTIVE as initial activation', async () => {
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(
      plan({
        status: 'PAUSED',
        currentRevisionId: 'published-1',
        revisions: [revision('PUBLISHED'), revision('DRAFT', { revisionNumber: 2 })],
      }),
    );
    await expect(
      service.activate(principal, 'plan-1', { version: 1 }, 'request'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive exercise for a new draft prescription', async () => {
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(plan());
    prisma.measurementDefinition.findMany.mockResolvedValue([]);
    prisma.exerciseDefinition.findMany.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000002',
        active: false,
        organizationId: null,
        code: 'knee.heel-slide',
        name: 'Ковзання пʼятою',
        lateralityApplicability: ['LEFT'],
      },
    ]);
    await expect(
      service.updatePlan(
        principal,
        'plan-1',
        {
          version: 1,
          revisionId: 'draft-1',
          title: 'План',
          startDate: '2026-09-02',
          goals: [],
          phases: [],
          exercisePrescriptions: [
            {
              exerciseDefinitionId: '00000000-0000-4000-8000-000000000002',
              repetitions: 10,
              displayOrder: 0,
            },
          ],
        },
        'request',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('conceals a cross-organization exercise prescription reference', async () => {
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(plan());
    prisma.measurementDefinition.findMany.mockResolvedValue([]);
    prisma.exerciseDefinition.findMany.mockResolvedValue([]);
    await expect(
      service.updatePlan(
        principal,
        'plan-1',
        {
          version: 1,
          revisionId: 'draft-1',
          title: 'План',
          startDate: '2026-09-02',
          goals: [],
          phases: [],
          exercisePrescriptions: [
            {
              exerciseDefinitionId: '00000000-0000-4000-8000-000000000099',
              repetitions: 10,
              displayOrder: 0,
            },
          ],
        },
        'request',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('conceals a cross-organization baseline measurement reference', async () => {
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(plan());
    prisma.measurementDefinition.findMany.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000010',
        valueType: 'NUMBER',
        unitCode: 'deg',
      },
    ]);
    prisma.measurement.findFirst.mockResolvedValue(null);
    await expect(
      service.updatePlan(
        principal,
        'plan-1',
        {
          version: 1,
          revisionId: 'draft-1',
          title: 'План',
          startDate: '2026-09-02',
          goals: [
            {
              title: 'Згинання',
              status: 'PLANNED',
              measurementDefinitionId: '00000000-0000-4000-8000-000000000010',
              baselineMeasurementId: '00000000-0000-4000-8000-000000000011',
              anatomicalRegion: 'knee',
              laterality: 'LEFT',
              targetOperator: 'GREATER_THAN_OR_EQUAL',
              targetValue: 120,
              targetUnit: 'deg',
              displayOrder: 0,
            },
          ],
          phases: [],
          exercisePrescriptions: [],
        },
        'request',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.measurement.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      }),
    );
  });

  it('copies an active revision before editing and only advances the pointer on publish', async () => {
    const published = revision('PUBLISHED', { goals: [], phases: [], prescriptions: [] });
    const active = plan({
      status: 'ACTIVE',
      currentRevisionId: 'published-1',
      revisions: [published],
    });
    prisma.rehabilitationPlan.findFirst.mockResolvedValue(active);
    prisma.rehabilitationPlan.updateMany.mockResolvedValue({ count: 1 });
    await service.createRevision(principal, 'plan-1', { version: 1 }, 'request');
    expect(prisma.rehabilitationPlanRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ basedOnRevisionId: 'published-1', revisionNumber: 2 }),
    });
    expect(prisma.rehabilitationPlanRevision.update).not.toHaveBeenCalled();

    const draft = revision('DRAFT', {
      id: 'draft-1',
      revisionNumber: 2,
      goals: [{ id: 'goal-1' }],
    });
    prisma.rehabilitationPlan.findFirst.mockReset();
    prisma.rehabilitationPlan.findFirst
      .mockResolvedValueOnce(
        plan({ status: 'ACTIVE', currentRevisionId: 'published-1', revisions: [published, draft] }),
      )
      .mockResolvedValueOnce(active);
    await service.publishRevision(
      principal,
      'plan-1',
      { version: 2, revisionId: 'draft-1' },
      'request',
    );
    expect(prisma.rehabilitationPlan.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentRevisionId: 'draft-1' }) }),
    );
    expect(prisma.rehabilitationPlanRevision.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: expect.objectContaining({ status: 'PUBLISHED' }),
    });
  });
});
