import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { EncountersService } from './encounters.service';

const principal: AuthenticatedPrincipal = {
  subject: 'sub',
  userId: 'user-b',
  organizationId: 'org-a',
  membershipId: 'mem-b',
  role: 'REHABILITATION_SPECIALIST',
  permissions: [],
  email: 'b@example.com',
  displayName: 'Andriy',
  organizationName: 'Org A',
};

function encounterRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'enc-1',
    organizationId: 'org-a',
    patientId: 'patient-1',
    practitionerId: 'prac-1',
    appointmentId: 'appt-1',
    startedAt: new Date('2026-09-10T09:05:00.000Z'),
    endedAt: null,
    status: 'IN_PROGRESS',
    createdByUserId: 'user-b',
    updatedByUserId: 'user-b',
    createdAt: new Date('2026-09-10T09:05:00.000Z'),
    updatedAt: new Date('2026-09-10T09:05:00.000Z'),
    patient: { id: 'patient-1', firstName: 'Іван', lastName: 'Коваленко', middleName: null },
    practitioner: { id: 'prac-1', user: { displayName: 'Andriy Specialist' } },
    appointment: {
      id: 'appt-1',
      startsAt: new Date('2026-09-10T09:00:00.000Z'),
      endsAt: new Date('2026-09-10T10:00:00.000Z'),
      appointmentType: null,
    },
    ...overrides,
  };
}

describe('EncountersService', () => {
  let prisma: {
    encounter: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    appointment: {
      findFirst: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    auditEvent: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: EncountersService;

  beforeEach(() => {
    prisma = {
      encounter: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      appointment: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
      },
      auditEvent: { create: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: typeof prisma) => unknown) => fn(prisma)),
    };
    service = new EncountersService(prisma as never);
  });

  it('conceals cross-org encounter GET as 404', async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(service.getById(principal, 'enc-foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.encounter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enc-foreign', organizationId: 'org-a' },
      }),
    );
  });

  it('completes encounter and linked appointment transactionally', async () => {
    prisma.encounter.findFirst.mockResolvedValue(encounterRow());
    prisma.encounter.update.mockResolvedValue(
      encounterRow({ status: 'COMPLETED', endedAt: new Date('2026-09-10T10:00:00.000Z') }),
    );
    prisma.appointment.findFirst.mockResolvedValue({
      id: 'appt-1',
      status: 'IN_PROGRESS',
      version: 4,
    });
    prisma.appointment.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.complete(principal, 'enc-1', 'req-complete');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'appt-1', organizationId: 'org-a', version: 4 },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ENCOUNTER_COMPLETED' }),
      }),
    );
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'APPOINTMENT_COMPLETED' }),
      }),
    );
    expect(result.status).toBe('COMPLETED');
  });

  it('rejects completing an encounter that is not in progress', async () => {
    prisma.encounter.findFirst.mockResolvedValue(encounterRow({ status: 'CANCELLED' }));

    await expect(service.complete(principal, 'enc-1', 'req-bad')).rejects.toMatchObject({
      response: { code: 'ENCOUNTER_INVALID_TRANSITION' },
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('is idempotent when encounter is already completed', async () => {
    const completed = encounterRow({
      status: 'COMPLETED',
      endedAt: new Date('2026-09-10T10:00:00.000Z'),
    });
    prisma.encounter.findFirst.mockResolvedValue(completed);

    const result = await service.complete(principal, 'enc-1', 'req-idempotent');

    expect(result.status).toBe('COMPLETED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('conceals cross-org complete as 404', async () => {
    prisma.encounter.findFirst.mockResolvedValue(null);

    await expect(service.complete(principal, 'enc-foreign', 'req-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns conflict when linked appointment version is stale', async () => {
    prisma.encounter.findFirst.mockResolvedValue(encounterRow());
    prisma.encounter.update.mockResolvedValue(
      encounterRow({ status: 'COMPLETED', endedAt: new Date('2026-09-10T10:00:00.000Z') }),
    );
    prisma.appointment.findFirst.mockResolvedValue({
      id: 'appt-1',
      status: 'IN_PROGRESS',
      version: 4,
    });
    prisma.appointment.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.complete(principal, 'enc-1', 'req-stale')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
