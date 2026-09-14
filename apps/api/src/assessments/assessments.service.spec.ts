import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { AssessmentsService } from './assessments.service';

const principal: AuthenticatedPrincipal = {
  subject: 'sub',
  userId: 'user-1',
  organizationId: 'org-1',
  membershipId: 'mem-1',
  role: 'REHABILITATION_SPECIALIST',
  permissions: [],
  email: 'specialist@example.invalid',
  displayName: 'Specialist',
  organizationName: 'Org',
};

function assessmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assessment-1',
    organizationId: 'org-1',
    patientId: 'patient-1',
    encounterId: null,
    practitionerId: 'practitioner-1',
    templateId: 'template-1',
    title: 'Knee',
    status: 'DRAFT',
    performedAt: new Date('2026-08-01T09:00:00.000Z'),
    completedAt: null,
    summary: null,
    voidedAt: null,
    voidedByUserId: null,
    voidReason: null,
    version: 1,
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    updatedAt: new Date('2026-08-01T09:00:00.000Z'),
    patient: { id: 'patient-1', firstName: 'Іван', lastName: 'Коваленко', middleName: null },
    practitioner: { id: 'practitioner-1', user: { id: 'user-1', displayName: 'Specialist' } },
    encounter: null,
    template: {
      id: 'template-1',
      organizationId: null,
      code: 'knee',
      revision: 1,
      name: 'Knee',
      description: null,
      active: true,
      configurableSample: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    },
    measurements: [],
    ...overrides,
  };
}

describe('AssessmentsService', () => {
  let prisma: Record<string, unknown> & {
    patient: { findFirst: ReturnType<typeof vi.fn> };
    practitioner: { findFirst: ReturnType<typeof vi.fn> };
    encounter: { findFirst: ReturnType<typeof vi.fn> };
    assessmentTemplate: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    assessment: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    measurement: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    measurementDefinition: { findMany: ReturnType<typeof vi.fn> };
    auditEvent: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: AssessmentsService;

  beforeEach(() => {
    prisma = {
      patient: { findFirst: vi.fn() },
      practitioner: { findFirst: vi.fn() },
      encounter: { findFirst: vi.fn() },
      assessmentTemplate: { findFirst: vi.fn(), findMany: vi.fn() },
      assessment: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
      measurement: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        updateMany: vi.fn(),
      },
      measurementDefinition: { findMany: vi.fn() },
      auditEvent: { create: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: typeof prisma) => unknown) => fn(prisma)),
    };
    service = new AssessmentsService(prisma as never);
  });

  it('conceals a cross-org assessment GET as 404', async () => {
    prisma.assessment.findFirst.mockResolvedValue(null);
    await expect(service.getById(principal, 'foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.assessment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign', organizationId: 'org-1' } }),
    );
  });

  it('conceals a cross-org patient assessment list as 404', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.listForPatient(principal, 'foreign', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.assessment.findMany).not.toHaveBeenCalled();
  });

  it('requires the authenticated user to have an active practitioner profile', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    prisma.practitioner.findFirst.mockResolvedValue(null);
    await expect(
      service.create(principal, 'patient-1', { title: 'Manual' }, 'req'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not trust a cross-org encounter link', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    prisma.practitioner.findFirst.mockResolvedValue({ id: 'practitioner-1' });
    prisma.encounter.findFirst.mockResolvedValue(null);
    await expect(
      service.create(principal, 'patient-1', { title: 'Manual', encounterId: 'foreign' }, 'req'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.encounter.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', organizationId: 'org-1' },
    });
  });

  it('returns 409 when a draft save uses a stale version', async () => {
    prisma.assessment.findFirst.mockResolvedValue(assessmentRow());
    prisma.assessment.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.update(principal, 'assessment-1', { version: 1, summary: 'Changed' }, 'req'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('allows only the first of two saves using the same version', async () => {
    prisma.assessment.findFirst
      .mockResolvedValueOnce(assessmentRow({ version: 1 }))
      .mockResolvedValueOnce(assessmentRow({ version: 2, summary: 'First' }))
      .mockResolvedValueOnce(assessmentRow({ version: 2, summary: 'First' }));
    prisma.assessment.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit' });

    const first = await service.update(
      principal,
      'assessment-1',
      { version: 1, summary: 'First' },
      'req-1',
    );
    expect(first.version).toBe(2);
    await expect(
      service.update(principal, 'assessment-1', { version: 1, summary: 'Second' }, 'req-2'),
    ).rejects.toMatchObject({ response: { code: 'ASSESSMENT_UPDATE_CONFLICT' } });
  });

  it('rejects normal PATCH after completion', async () => {
    prisma.assessment.findFirst.mockResolvedValue(
      assessmentRow({ status: 'COMPLETED', completedAt: new Date() }),
    );
    await expect(
      service.update(principal, 'assessment-1', { version: 1, summary: 'Overwrite' }, 'req'),
    ).rejects.toMatchObject({ response: { code: 'ASSESSMENT_NOT_EDITABLE' } });
  });

  it('blocks completion when a required template item is missing', async () => {
    prisma.assessment.findFirst.mockResolvedValue(
      assessmentRow({
        template: {
          ...assessmentRow().template,
          items: [{ id: 'item-1', required: true, measurementDefinition: { code: 'pain.nrs' } }],
        },
      }),
    );
    await expect(
      service.complete(principal, 'assessment-1', { version: 1 }, 'req'),
    ).rejects.toMatchObject({ response: { code: 'ASSESSMENT_REQUIRED_MEASUREMENTS_MISSING' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('completes and audits in one transaction', async () => {
    prisma.assessment.findFirst
      .mockResolvedValueOnce(assessmentRow())
      .mockResolvedValueOnce(
        assessmentRow({ status: 'COMPLETED', completedAt: new Date(), version: 2 }),
      );
    prisma.assessment.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit' });
    const result = await service.complete(principal, 'assessment-1', { version: 1 }, 'req');
    expect(result.status).toBe('COMPLETED');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ASSESSMENT_COMPLETED' }),
      }),
    );
  });

  it('surfaces an audit failure from the completion transaction', async () => {
    prisma.assessment.findFirst.mockResolvedValue(assessmentRow());
    prisma.assessment.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditEvent.create.mockRejectedValue(new Error('audit unavailable'));
    await expect(
      service.complete(principal, 'assessment-1', { version: 1 }, 'req'),
    ).rejects.toThrow('audit unavailable');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects VOIDED to COMPLETED', async () => {
    prisma.assessment.findFirst.mockResolvedValue(
      assessmentRow({
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedByUserId: 'user-1',
        voidReason: 'Incorrect',
      }),
    );
    await expect(
      service.complete(principal, 'assessment-1', { version: 2 }, 'req'),
    ).rejects.toMatchObject({ response: { code: 'ASSESSMENT_INVALID_TRANSITION' } });
  });

  it('voids a completed assessment without deleting measurements', async () => {
    const completed = assessmentRow({ status: 'COMPLETED', completedAt: new Date() });
    prisma.assessment.findFirst
      .mockResolvedValueOnce(completed)
      .mockResolvedValueOnce(
        assessmentRow({
          status: 'VOIDED',
          voidedAt: new Date(),
          voidedByUserId: 'user-1',
          voidReason: 'Incorrect',
        }),
      );
    prisma.assessment.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit' });
    const result = await service.void(
      principal,
      'assessment-1',
      { version: 1, reason: 'Incorrect' },
      'req',
    );
    expect(result.status).toBe('VOIDED');
    expect(prisma.measurement.deleteMany).not.toHaveBeenCalled();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'ASSESSMENT_VOIDED' }) }),
    );
  });

  it('scopes measurement history by organization and patient', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    prisma.measurement.findMany.mockResolvedValue([]);
    await service.history(principal, 'patient-1', { definitionCode: 'pain.nrs' });
    expect(prisma.measurement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          patientId: 'patient-1',
          definitionCode: 'pain.nrs',
          assessment: { status: 'COMPLETED' },
        }),
      }),
    );
  });
});
