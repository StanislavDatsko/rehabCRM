import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { AppointmentsService } from './appointments.service';

const principal: AuthenticatedPrincipal = {
  subject: 'sub',
  userId: 'user-a',
  organizationId: 'org-a',
  membershipId: 'mem-a',
  role: 'RECEPTIONIST',
  permissions: [],
  email: 'a@example.com',
  displayName: 'Alice',
  organizationName: 'Org A',
};

function appointmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'appt-1',
    organizationId: 'org-a',
    patientId: 'patient-1',
    practitionerId: 'prac-1',
    locationId: null,
    roomId: null,
    appointmentTypeId: null,
    startsAt: new Date('2026-09-10T09:00:00.000Z'),
    endsAt: new Date('2026-09-10T10:00:00.000Z'),
    status: 'SCHEDULED',
    reason: null,
    administrativeNote: null,
    cancellationReason: null,
    version: 2,
    createdByUserId: 'user-a',
    updatedByUserId: 'user-a',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    patient: { id: 'patient-1', firstName: 'Іван', lastName: 'Коваленко', middleName: null },
    practitioner: {
      id: 'prac-1',
      user: { displayName: 'Andriy Specialist' },
    },
    location: null,
    room: null,
    appointmentType: null,
    encounter: null,
    ...overrides,
  };
}

describe('AppointmentsService', () => {
  let prisma: {
    appointment: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    patient: { findFirst: ReturnType<typeof vi.fn> };
    practitioner: { findFirst: ReturnType<typeof vi.fn> };
    appointmentType: { findFirst: ReturnType<typeof vi.fn> };
    location: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    room: { findFirst: ReturnType<typeof vi.fn> };
    encounter: { create: ReturnType<typeof vi.fn> };
    auditEvent: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: AppointmentsService;

  beforeEach(() => {
    prisma = {
      appointment: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      patient: { findFirst: vi.fn() },
      practitioner: { findFirst: vi.fn() },
      appointmentType: { findFirst: vi.fn() },
      location: { findFirst: vi.fn(), findMany: vi.fn() },
      room: { findFirst: vi.fn() },
      encounter: { create: vi.fn() },
      auditEvent: { create: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: typeof prisma) => unknown) => fn(prisma)),
    };
    service = new AppointmentsService(prisma as never);
  });

  it('scopes calendar queries by organization and bounded range', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);

    await service.calendar(principal, {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T00:00:00.000Z',
      practitionerId: 'prac-1',
    });

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-a',
          practitionerId: 'prac-1',
          startsAt: { lt: new Date('2026-09-30T00:00:00.000Z') },
          endsAt: { gt: new Date('2026-09-01T00:00:00.000Z') },
        }),
      }),
    );
  });

  it('conceals cross-org appointment GET as 404', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);

    await expect(service.getById(principal, 'appt-foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'appt-foreign', organizationId: 'org-a' },
      }),
    );
  });

  it('rejects archived patient scheduling with PATIENT_NOT_SCHEDULABLE', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', status: 'ARCHIVED' });

    await expect(
      service.create(
        principal,
        {
          patientId: 'patient-1',
          practitionerId: 'prac-1',
          startsAt: '2026-09-10T09:00:00.000Z',
          endsAt: '2026-09-10T10:00:00.000Z',
        },
        'req-1',
      ),
    ).rejects.toMatchObject({
      response: { code: 'PATIENT_NOT_SCHEDULABLE' },
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows inactive patient scheduling', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', status: 'INACTIVE' });
    prisma.practitioner.findFirst.mockResolvedValue({ id: 'prac-1' });
    prisma.appointment.create.mockResolvedValue(appointmentRow({ version: 1 }));
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit-1' });

    await service.create(
      principal,
      {
        patientId: 'patient-1',
        practitionerId: 'prac-1',
        startsAt: '2026-09-10T09:00:00.000Z',
        endsAt: '2026-09-10T10:00:00.000Z',
      },
      'req-inactive',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('conceals cross-org patient as 404 on create', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        principal,
        {
          patientId: 'patient-foreign',
          practitionerId: 'prac-1',
          startsAt: '2026-09-10T09:00:00.000Z',
          endsAt: '2026-09-10T10:00:00.000Z',
        },
        'req-2',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects inactive practitioner with PRACTITIONER_NOT_AVAILABLE', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', status: 'ACTIVE' });
    prisma.practitioner.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'prac-1', status: 'DISABLED' });

    await expect(
      service.create(
        principal,
        {
          patientId: 'patient-1',
          practitionerId: 'prac-1',
          startsAt: '2026-09-10T09:00:00.000Z',
          endsAt: '2026-09-10T10:00:00.000Z',
        },
        'req-3',
      ),
    ).rejects.toMatchObject({
      response: { code: 'PRACTITIONER_NOT_AVAILABLE' },
    });
  });

  it('conceals cross-org practitioner as 404', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', status: 'ACTIVE' });
    prisma.practitioner.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        principal,
        {
          patientId: 'patient-1',
          practitionerId: 'prac-foreign',
          startsAt: '2026-09-10T09:00:00.000Z',
          endsAt: '2026-09-10T10:00:00.000Z',
        },
        'req-4',
      ),
    ).rejects.toMatchObject({
      response: { code: 'PRACTITIONER_NOT_FOUND' },
    });
  });

  it('maps practitioner overlap database errors to APPOINTMENT_TIME_CONFLICT', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', status: 'ACTIVE' });
    prisma.practitioner.findFirst.mockResolvedValue({ id: 'prac-1' });
    prisma.$transaction.mockRejectedValue({
      code: '23P01',
      message: 'conflicting key value violates exclusion constraint "appointments_no_practitioner_overlap"',
    });

    await expect(
      service.create(
        principal,
        {
          patientId: 'patient-1',
          practitionerId: 'prac-1',
          startsAt: '2026-09-10T09:30:00.000Z',
          endsAt: '2026-09-10T10:30:00.000Z',
        },
        'req-overlap',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPOINTMENT_TIME_CONFLICT' },
    });
  });

  it('maps a PostgreSQL exclusion-lock deadlock to APPOINTMENT_TIME_CONFLICT', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', status: 'ACTIVE' });
    prisma.practitioner.findFirst.mockResolvedValue({ id: 'prac-1' });
    prisma.$transaction.mockRejectedValue({
      message: 'PostgresError { code: "40P01", message: "deadlock detected" }',
    });

    await expect(
      service.create(
        principal,
        {
          patientId: 'patient-1',
          practitionerId: 'prac-1',
          startsAt: '2026-09-10T09:30:00.000Z',
          endsAt: '2026-09-10T10:30:00.000Z',
        },
        'req-deadlock',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPOINTMENT_TIME_CONFLICT' },
    });
  });

  it('writes appointment + audit in one transaction on create', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1', status: 'ACTIVE' });
    prisma.practitioner.findFirst.mockResolvedValue({ id: 'prac-1' });
    prisma.appointment.create.mockResolvedValue(appointmentRow({ id: 'appt-new', version: 1 }));
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.create(
      principal,
      {
        patientId: 'patient-1',
        practitionerId: 'prac-1',
        startsAt: '2026-09-10T09:00:00.000Z',
        endsAt: '2026-09-10T10:00:00.000Z',
      },
      'req-create',
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'APPOINTMENT_CREATED',
          entityType: 'Appointment',
          organizationId: 'org-a',
        }),
      }),
    );
    expect(result.id).toBe('appt-new');
  });

  it('returns 409 on stale optimistic version during update', async () => {
    prisma.appointment.findFirst
      .mockResolvedValueOnce(appointmentRow({ version: 3 }))
      .mockResolvedValueOnce({ id: 'appt-1' });
    prisma.appointment.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.update(
        principal,
        'appt-1',
        { version: 2, reason: 'Updated note' },
        'req-stale',
      ),
    ).rejects.toMatchObject({
      response: { code: 'APPOINTMENT_UPDATE_CONFLICT' },
    });

    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('writes APPOINTMENT_RESCHEDULED audit when time changes', async () => {
    prisma.appointment.findFirst
      .mockResolvedValueOnce(appointmentRow({ version: 2 }))
      .mockResolvedValueOnce(appointmentRow({ version: 3 }));
    prisma.appointment.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit-1' });

    await service.update(
      principal,
      'appt-1',
      {
        version: 2,
        startsAt: '2026-09-10T11:00:00.000Z',
        endsAt: '2026-09-10T12:00:00.000Z',
      },
      'req-reschedule',
    );

    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'APPOINTMENT_RESCHEDULED',
          metadata: expect.objectContaining({
            oldStartsAt: '2026-09-10T09:00:00.000Z',
            newStartsAt: '2026-09-10T11:00:00.000Z',
          }),
        }),
      }),
    );
  });

  it('allows SCHEDULED -> CONFIRMED transition', async () => {
    prisma.appointment.findFirst
      .mockResolvedValueOnce(appointmentRow({ status: 'SCHEDULED', version: 2 }))
      .mockResolvedValueOnce(appointmentRow({ status: 'CONFIRMED', version: 3 }));
    prisma.appointment.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.confirm(principal, 'appt-1', { version: 2 }, 'req-confirm');

    expect(result.status).toBe('CONFIRMED');
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'APPOINTMENT_CONFIRMED' }),
      }),
    );
  });

  it('rejects COMPLETED -> CANCELLED transition', async () => {
    prisma.appointment.findFirst.mockResolvedValue(
      appointmentRow({ status: 'COMPLETED', version: 4 }),
    );

    await expect(
      service.cancel(principal, 'appt-1', { version: 4 }, 'req-cancel'),
    ).rejects.toMatchObject({
      response: { code: 'APPOINTMENT_INVALID_TRANSITION' },
    });
  });

  it('starts encounter from CHECKED_IN and creates audit event', async () => {
    prisma.appointment.findFirst
      .mockResolvedValueOnce(appointmentRow({ status: 'CHECKED_IN', version: 3, encounter: null }))
      .mockResolvedValueOnce(
        appointmentRow({ status: 'IN_PROGRESS', version: 4, encounter: { id: 'enc-1' } }),
      );
    prisma.appointment.updateMany.mockResolvedValue({ count: 1 });
    prisma.encounter.create.mockResolvedValue({
      id: 'enc-1',
      organizationId: 'org-a',
      patientId: 'patient-1',
      practitionerId: 'prac-1',
      appointmentId: 'appt-1',
      startedAt: new Date('2026-09-10T09:05:00.000Z'),
      endedAt: null,
      status: 'IN_PROGRESS',
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
    });
    prisma.auditEvent.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.startEncounter(
      principal,
      'appt-1',
      { version: 3 },
      'req-start',
    );

    expect(result.id).toBe('enc-1');
    expect(prisma.encounter.create).toHaveBeenCalled();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ENCOUNTER_STARTED', entityType: 'Encounter' }),
      }),
    );
  });

  it('rejects starting encounter when one already exists', async () => {
    prisma.appointment.findFirst.mockResolvedValue(
      appointmentRow({ status: 'CHECKED_IN', encounter: { id: 'enc-existing' } }),
    );

    await expect(
      service.startEncounter(principal, 'appt-1', { version: 3 }, 'req-dup'),
    ).rejects.toMatchObject({
      response: { code: 'ENCOUNTER_ALREADY_EXISTS' },
    });
  });

  it('rejects NO_SHOW -> start encounter', async () => {
    prisma.appointment.findFirst.mockResolvedValue(
      appointmentRow({ status: 'NO_SHOW', encounter: null }),
    );

    await expect(
      service.startEncounter(principal, 'appt-1', { version: 2 }, 'req-noshow'),
    ).rejects.toMatchObject({
      response: { code: 'APPOINTMENT_INVALID_TRANSITION' },
    });
  });

  it('maps unique encounter constraint to ENCOUNTER_ALREADY_EXISTS', async () => {
    prisma.appointment.findFirst
      .mockResolvedValueOnce(
        appointmentRow({ status: 'CHECKED_IN', version: 3, encounter: null }),
      )
      .mockResolvedValueOnce(
        appointmentRow({ status: 'IN_PROGRESS', version: 4, encounter: { id: 'enc-1' } }),
      );
    prisma.appointment.updateMany.mockResolvedValue({ count: 1 });
    prisma.encounter.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['appointmentId'] },
    });

    await expect(
      service.startEncounter(principal, 'appt-1', { version: 3 }, 'req-race'),
    ).rejects.toMatchObject({
      response: { code: 'ENCOUNTER_ALREADY_EXISTS' },
    });
  });

  it('does not write audit when optimistic update fails', async () => {
    prisma.appointment.findFirst
      .mockResolvedValueOnce(appointmentRow({ status: 'SCHEDULED', version: 2 }))
      .mockResolvedValueOnce({ id: 'appt-1' });
    prisma.appointment.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.checkIn(principal, 'appt-1', { version: 2 }, 'req-fail'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });
});
