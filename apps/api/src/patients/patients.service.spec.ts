import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { PatientsService } from './patients.service';

const principal: AuthenticatedPrincipal = {
  subject: 'sub',
  userId: 'user-a',
  organizationId: 'org-a',
  membershipId: 'mem-a',
  role: 'REHABILITATION_SPECIALIST',
  permissions: [],
  email: 'a@example.com',
  displayName: 'Alice',
  organizationName: 'Org A',
};

function patientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'patient-1',
    organizationId: 'org-a',
    firstName: 'Іван',
    lastName: 'Коваленко',
    middleName: null,
    dateOfBirth: null,
    sex: null,
    phoneDisplay: null,
    phoneNormalized: null,
    email: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    countryCode: null,
    emergencyContactName: null,
    emergencyContactPhoneDisplay: null,
    emergencyContactPhoneNormalized: null,
    emergencyContactRelationship: null,
    responsiblePractitionerId: null,
    status: 'ACTIVE',
    internalReferenceNumber: null,
    version: 3,
    createdByUserId: 'user-a',
    updatedByUserId: 'user-a',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    responsiblePractitioner: null,
    ...overrides,
  };
}

describe('PatientsService', () => {
  let prisma: {
    patient: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    auditEvent: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    practitioner: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: PatientsService;

  beforeEach(() => {
    prisma = {
      patient: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      auditEvent: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      practitioner: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (fn: (tx: typeof prisma) => unknown) => fn(prisma)),
    };
    service = new PatientsService(prisma as never);
  });

  it('scopes getById by organization and conceals cross-org ids as 404', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(service.getById(principal, 'patient-foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-foreign', organizationId: 'org-a' },
      }),
    );
  });

  it('does not update a patient from another organization', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      service.updateAdministrative(
        principal,
        'patient-foreign',
        { version: 1, firstName: 'Змінене' },
        'req-cross-org',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-foreign', organizationId: 'org-a' },
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('scopes list queries by organizationId', async () => {
    prisma.patient.count.mockResolvedValue(0);
    prisma.patient.findMany.mockResolvedValue([]);

    await service.list(principal, { status: 'ACTIVE' });

    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-a', status: 'ACTIVE' }),
      }),
    );
  });

  it('rejects responsible practitioner outside org or not ACTIVE', async () => {
    prisma.practitioner.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        principal,
        {
          firstName: 'Іван',
          lastName: 'Коваленко',
          middleName: null,
          dateOfBirth: null,
          sex: null,
          phone: null,
          email: null,
          responsiblePractitionerId: 'prac-other',
          internalReferenceNumber: null,
        },
        'req-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.practitioner.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'prac-other',
        organizationId: 'org-a',
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 409 on stale optimistic version', async () => {
    prisma.patient.findFirst
      .mockResolvedValueOnce(patientRow({ version: 3 }))
      .mockResolvedValueOnce({ id: 'patient-1' });
    prisma.patient.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateAdministrative(
        principal,
        'patient-1',
        { version: 2, firstName: 'Петро' },
        'req-2',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.patient.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-1', organizationId: 'org-a', version: 2 },
      }),
    );
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('writes patient + audit in one transaction on create', async () => {
    prisma.practitioner.findFirst.mockResolvedValue({ id: 'prac-1' });
    const created = patientRow({
      id: 'patient-new',
      responsiblePractitionerId: 'prac-1',
      version: 1,
    });
    prisma.patient.create.mockResolvedValue(created);
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.create(
      principal,
      {
        firstName: 'Іван',
        lastName: 'Коваленко',
        middleName: null,
        dateOfBirth: null,
        sex: null,
        phone: null,
        email: null,
        responsiblePractitionerId: 'prac-1',
        internalReferenceNumber: null,
      },
      'req-create',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-a',
          createdByUserId: 'user-a',
          responsiblePractitionerId: 'prac-1',
        }),
      }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'PATIENT_CREATED',
          entityType: 'Patient',
          entityId: 'patient-new',
          organizationId: 'org-a',
          requestId: 'req-create',
        }),
      }),
    );
    expect(result.id).toBe('patient-new');
  });

  it('does not leave an audit event when the mutation update fails', async () => {
    prisma.patient.findFirst
      .mockResolvedValueOnce(patientRow({ version: 1 }))
      .mockResolvedValueOnce({ id: 'patient-1' });
    prisma.patient.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.changeStatus(
        principal,
        'patient-1',
        { status: 'ARCHIVED', version: 1 },
        'req-status',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('rolls back via transaction when audit insert fails after create', async () => {
    prisma.patient.create.mockResolvedValue(patientRow({ id: 'patient-x', version: 1 }));
    prisma.auditEvent.create.mockRejectedValue(new Error('audit failed'));

    await expect(
      service.create(
        principal,
        {
          firstName: 'Іван',
          lastName: 'Коваленко',
          middleName: null,
          dateOfBirth: null,
          sex: null,
          phone: null,
          email: null,
          internalReferenceNumber: null,
        },
        'req-fail',
      ),
    ).rejects.toThrow('audit failed');
  });
});
