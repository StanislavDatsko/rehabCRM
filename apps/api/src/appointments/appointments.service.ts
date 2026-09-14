import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AppointmentCalendarResponse,
  AppointmentDetailResponse,
  EncounterResponse,
  PatientAppointmentSummary,
  SchedulingCatalogResponse,
} from '@repo/contracts';
import type { AppointmentStatus, PatientStatus, Prisma } from '@prisma/client';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import {
  isPostgresDeadlockError,
  isPractitionerOverlapError,
  writeAuditEvent,
} from '../common/audit/write-audit';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { canTransitionAppointment } from './appointment-transitions';
import {
  APPOINTMENT_INCLUDE,
  ENCOUNTER_INCLUDE,
  toAppointmentCalendarItem,
  toAppointmentDetail,
  toEncounterResponse,
  toSchedulingCatalog,
  type AppointmentWithRelations,
} from './appointment.mapper';
import type {
  CalendarQuery,
  CancelAppointmentBody,
  CreateAppointmentBody,
  UpdateAppointmentBody,
  VersionCommand,
} from './appointment.schemas';

type Tx = Prisma.TransactionClient;

const SCHEDULABLE_PATIENT_STATUSES: readonly PatientStatus[] = ['ACTIVE', 'INACTIVE'];
const UPDATABLE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
];

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async calendar(
    principal: AuthenticatedPrincipal,
    query: CalendarQuery,
  ): Promise<AppointmentCalendarResponse> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const where: Prisma.AppointmentWhereInput = {
      organizationId: principal.organizationId,
      startsAt: { lt: to },
      endsAt: { gt: from },
    };

    if (query.practitionerId) {
      where.practitionerId = query.practitionerId;
    }
    if (query.patientId) {
      where.patientId = query.patientId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.locationId) {
      where.locationId = query.locationId;
    }

    const rows = await this.prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });

    return {
      items: rows.map((row) => toAppointmentCalendarItem(row)),
      from: query.from,
      to: query.to,
    };
  }

  async getCatalog(principal: AuthenticatedPrincipal): Promise<SchedulingCatalogResponse> {
    const [types, locations] = await Promise.all([
      this.prisma.appointmentType.findMany({
        where: {
          organizationId: principal.organizationId,
          status: 'ACTIVE',
        },
        select: { id: true, name: true, defaultDurationMinutes: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.location.findMany({
        where: {
          organizationId: principal.organizationId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          timezone: true,
          rooms: {
            where: { status: 'ACTIVE' },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return toSchedulingCatalog(types, locations);
  }

  async getPatientSummary(
    principal: AuthenticatedPrincipal,
    patientId: string,
  ): Promise<PatientAppointmentSummary> {
    await this.requirePatientInOrg(principal.organizationId, patientId);

    const now = new Date();
    const [upcomingRow, recentRows] = await Promise.all([
      this.prisma.appointment.findFirst({
        where: {
          organizationId: principal.organizationId,
          patientId,
          startsAt: { gte: now },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
        },
        include: APPOINTMENT_INCLUDE,
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.appointment.findMany({
        where: {
          organizationId: principal.organizationId,
          patientId,
          OR: [{ startsAt: { lt: now } }, { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } }],
        },
        include: APPOINTMENT_INCLUDE,
        orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
        take: 5,
      }),
    ]);

    return {
      upcoming: upcomingRow ? toAppointmentCalendarItem(upcomingRow) : null,
      recent: recentRows.map((row) => toAppointmentCalendarItem(row)),
    };
  }

  async getById(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<AppointmentDetailResponse> {
    const appointment = await this.requireAppointment(principal.organizationId, id);
    return toAppointmentDetail(appointment);
  }

  async create(
    principal: AuthenticatedPrincipal,
    body: CreateAppointmentBody,
    requestId: string,
  ): Promise<AppointmentDetailResponse> {
    await this.assertSchedulablePatient(principal.organizationId, body.patientId);
    await this.assertActivePractitioner(principal.organizationId, body.practitionerId);
    await this.assertAppointmentType(principal.organizationId, body.appointmentTypeId ?? null);
    await this.assertLocation(principal.organizationId, body.locationId ?? null);
    await this.assertRoom(
      principal.organizationId,
      body.locationId ?? null,
      body.roomId ?? null,
    );

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const appointment = await tx.appointment.create({
          data: {
            organizationId: principal.organizationId,
            patientId: body.patientId,
            practitionerId: body.practitionerId,
            appointmentTypeId: body.appointmentTypeId ?? null,
            locationId: body.locationId ?? null,
            roomId: body.roomId ?? null,
            startsAt,
            endsAt,
            reason: body.reason ?? null,
            administrativeNote: body.administrativeNote ?? null,
            createdByUserId: principal.userId,
            updatedByUserId: principal.userId,
          },
          include: APPOINTMENT_INCLUDE,
        });

        await writeAuditEvent(tx, {
          organizationId: principal.organizationId,
          actorUserId: principal.userId,
          action: 'APPOINTMENT_CREATED',
          entityType: 'Appointment',
          entityId: appointment.id,
          requestId,
          metadata: {
            changedFields: ['*'],
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        });

        return appointment;
      });

      return toAppointmentDetail(created);
    } catch (error) {
      this.rethrowConflict(error);
      throw error;
    }
  }

  async update(
    principal: AuthenticatedPrincipal,
    id: string,
    body: UpdateAppointmentBody,
    requestId: string,
  ): Promise<AppointmentDetailResponse> {
    const existing = await this.requireAppointment(principal.organizationId, id);

    if (!UPDATABLE_APPOINTMENT_STATUSES.includes(existing.status)) {
      throw new BadRequestException({
        code: 'APPOINTMENT_INVALID_TRANSITION',
        message: 'This appointment cannot be modified in its current status.',
      });
    }

    if (body.practitionerId !== undefined) {
      await this.assertActivePractitioner(principal.organizationId, body.practitionerId);
    }
    if (body.appointmentTypeId !== undefined) {
      await this.assertAppointmentType(principal.organizationId, body.appointmentTypeId);
    }

    const nextLocationId =
      body.locationId !== undefined ? body.locationId : existing.locationId;
    if (body.locationId !== undefined) {
      await this.assertLocation(principal.organizationId, body.locationId);
    }

    const nextRoomId = body.roomId !== undefined ? body.roomId : existing.roomId;
    if (body.roomId !== undefined || body.locationId !== undefined) {
      await this.assertRoom(principal.organizationId, nextLocationId, nextRoomId);
    }

    const nextStartsAt = body.startsAt ? new Date(body.startsAt) : existing.startsAt;
    const nextEndsAt = body.endsAt ? new Date(body.endsAt) : existing.endsAt;
    const nextPractitionerId = body.practitionerId ?? existing.practitionerId;

    const data: Prisma.AppointmentUncheckedUpdateManyInput = {
      updatedByUserId: principal.userId,
      version: { increment: 1 },
    };

    if (body.practitionerId !== undefined) data.practitionerId = body.practitionerId;
    if (body.appointmentTypeId !== undefined) {
      data.appointmentTypeId = body.appointmentTypeId;
    }
    if (body.locationId !== undefined) data.locationId = body.locationId;
    if (body.roomId !== undefined) data.roomId = body.roomId;
    if (body.startsAt !== undefined) data.startsAt = nextStartsAt;
    if (body.endsAt !== undefined) data.endsAt = nextEndsAt;
    if (body.reason !== undefined) data.reason = body.reason;
    if (body.administrativeNote !== undefined) {
      data.administrativeNote = body.administrativeNote;
    }

    const rescheduleFields = ['startsAt', 'endsAt', 'practitionerId'] as const;
    const rescheduled = rescheduleFields.some((field) => {
      if (body[field] === undefined) {
        return false;
      }
      if (field === 'startsAt') {
        return nextStartsAt.getTime() !== existing.startsAt.getTime();
      }
      if (field === 'endsAt') {
        return nextEndsAt.getTime() !== existing.endsAt.getTime();
      }
      return nextPractitionerId !== existing.practitionerId;
    });

    const changedFields = Object.keys(data).filter(
      (key) => key !== 'updatedByUserId' && key !== 'version',
    );
    if (changedFields.length === 0) {
      return toAppointmentDetail(existing);
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const appointment = await this.applyVersionedUpdate(
          tx,
          principal.organizationId,
          id,
          body.version,
          data,
        );

        await writeAuditEvent(tx, {
          organizationId: principal.organizationId,
          actorUserId: principal.userId,
          action: rescheduled ? 'APPOINTMENT_RESCHEDULED' : 'APPOINTMENT_UPDATED',
          entityType: 'Appointment',
          entityId: id,
          requestId,
          metadata: rescheduled
            ? {
                changedFields: [
                  ...new Set(
                    changedFields.map((field) =>
                      field === 'practitionerId' ? 'practitionerId' : field,
                    ),
                  ),
                ],
                oldStartsAt: existing.startsAt.toISOString(),
                oldEndsAt: existing.endsAt.toISOString(),
                newStartsAt: nextStartsAt.toISOString(),
                newEndsAt: nextEndsAt.toISOString(),
              }
            : { changedFields },
        });

        return appointment;
      });

      return toAppointmentDetail(updated);
    } catch (error) {
      this.rethrowConflict(error);
      throw error;
    }
  }

  async confirm(
    principal: AuthenticatedPrincipal,
    id: string,
    body: VersionCommand,
    requestId: string,
  ): Promise<AppointmentDetailResponse> {
    return this.transitionStatus(
      principal,
      id,
      body.version,
      'CONFIRMED',
      'APPOINTMENT_CONFIRMED',
      requestId,
    );
  }

  async checkIn(
    principal: AuthenticatedPrincipal,
    id: string,
    body: VersionCommand,
    requestId: string,
  ): Promise<AppointmentDetailResponse> {
    return this.transitionStatus(
      principal,
      id,
      body.version,
      'CHECKED_IN',
      'APPOINTMENT_CHECKED_IN',
      requestId,
    );
  }

  async markNoShow(
    principal: AuthenticatedPrincipal,
    id: string,
    body: VersionCommand,
    requestId: string,
  ): Promise<AppointmentDetailResponse> {
    return this.transitionStatus(
      principal,
      id,
      body.version,
      'NO_SHOW',
      'APPOINTMENT_MARKED_NO_SHOW',
      requestId,
    );
  }

  async cancel(
    principal: AuthenticatedPrincipal,
    id: string,
    body: CancelAppointmentBody,
    requestId: string,
  ): Promise<AppointmentDetailResponse> {
    const existing = await this.requireAppointment(principal.organizationId, id);

    if (!canTransitionAppointment(existing.status, 'CANCELLED')) {
      throw new BadRequestException({
        code: 'APPOINTMENT_INVALID_TRANSITION',
        message: 'This appointment cannot be cancelled in its current status.',
      });
    }

    if (existing.status === 'CANCELLED') {
      return toAppointmentDetail(existing);
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const appointment = await this.applyVersionedUpdate(
          tx,
          principal.organizationId,
          id,
          body.version,
          {
            status: 'CANCELLED',
            cancellationReason: body.cancellationReason ?? null,
            updatedByUserId: principal.userId,
            version: { increment: 1 },
          },
        );

        await writeAuditEvent(tx, {
          organizationId: principal.organizationId,
          actorUserId: principal.userId,
          action: 'APPOINTMENT_CANCELLED',
          entityType: 'Appointment',
          entityId: id,
          requestId,
          metadata: {
            changedFields: ['status', 'cancellationReason'],
            statusChange: { from: existing.status, to: 'CANCELLED' },
          },
        });

        return appointment;
      });

      return toAppointmentDetail(updated);
    } catch (error) {
      this.rethrowConflict(error);
      throw error;
    }
  }

  async startEncounter(
    principal: AuthenticatedPrincipal,
    id: string,
    body: VersionCommand,
    requestId: string,
  ): Promise<EncounterResponse> {
    const existing = await this.requireAppointment(principal.organizationId, id);

    if (existing.encounter) {
      throw new ConflictException({
        code: 'ENCOUNTER_ALREADY_EXISTS',
        message: 'An encounter already exists for this appointment.',
      });
    }

    if (!canTransitionAppointment(existing.status, 'IN_PROGRESS')) {
      throw new BadRequestException({
        code: 'APPOINTMENT_INVALID_TRANSITION',
        message: 'This appointment cannot start an encounter in its current status.',
      });
    }

    const startedAt = new Date();

    try {
      const encounter = await this.prisma.$transaction(async (tx) => {
        const appointment = await this.applyVersionedUpdate(
          tx,
          principal.organizationId,
          id,
          body.version,
          {
            status: 'IN_PROGRESS',
            updatedByUserId: principal.userId,
            version: { increment: 1 },
          },
        );

        const createdEncounter = await tx.encounter.create({
          data: {
            organizationId: principal.organizationId,
            patientId: appointment.patientId,
            practitionerId: appointment.practitionerId,
            appointmentId: appointment.id,
            startedAt,
            status: 'IN_PROGRESS',
            createdByUserId: principal.userId,
            updatedByUserId: principal.userId,
          },
          include: ENCOUNTER_INCLUDE,
        });

        await writeAuditEvent(tx, {
          organizationId: principal.organizationId,
          actorUserId: principal.userId,
          action: 'ENCOUNTER_STARTED',
          entityType: 'Encounter',
          entityId: createdEncounter.id,
          requestId,
          metadata: {
            appointmentId: appointment.id,
            startedAt: startedAt.toISOString(),
          },
        });

        return createdEncounter;
      });

      return toEncounterResponse(encounter);
    } catch (error) {
      if (this.isUniqueEncounterError(error)) {
        throw new ConflictException({
          code: 'ENCOUNTER_ALREADY_EXISTS',
          message: 'An encounter already exists for this appointment.',
        });
      }
      this.rethrowConflict(error);
      throw error;
    }
  }

  private async transitionStatus(
    principal: AuthenticatedPrincipal,
    id: string,
    expectedVersion: number,
    to: AppointmentStatus,
    auditAction: string,
    requestId: string,
  ): Promise<AppointmentDetailResponse> {
    const existing = await this.requireAppointment(principal.organizationId, id);

    if (existing.status === to) {
      return toAppointmentDetail(existing);
    }

    if (!canTransitionAppointment(existing.status, to)) {
      throw new BadRequestException({
        code: 'APPOINTMENT_INVALID_TRANSITION',
        message: 'This appointment status change is not allowed.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const appointment = await this.applyVersionedUpdate(
        tx,
        principal.organizationId,
        id,
        expectedVersion,
        {
          status: to,
          updatedByUserId: principal.userId,
          version: { increment: 1 },
        },
      );

      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: auditAction,
        entityType: 'Appointment',
        entityId: id,
        requestId,
        metadata: {
          changedFields: ['status'],
          statusChange: { from: existing.status, to },
        },
      });

      return appointment;
    });

    return toAppointmentDetail(updated);
  }

  private async requireAppointment(
    organizationId: string,
    id: string,
  ): Promise<AppointmentWithRelations> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, organizationId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      throw new NotFoundException({
        code: 'APPOINTMENT_NOT_FOUND',
        message: 'Appointment was not found.',
      });
    }
    return appointment;
  }

  private async requirePatientInOrg(
    organizationId: string,
    patientId: string,
  ): Promise<{ id: string; status: PatientStatus }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      select: { id: true, status: true },
    });
    if (!patient) {
      throw new NotFoundException({
        code: 'PATIENT_NOT_FOUND',
        message: 'Patient was not found.',
      });
    }
    return patient;
  }

  private async assertSchedulablePatient(
    organizationId: string,
    patientId: string,
  ): Promise<void> {
    const patient = await this.requirePatientInOrg(organizationId, patientId);
    if (!SCHEDULABLE_PATIENT_STATUSES.includes(patient.status)) {
      throw new BadRequestException({
        code: 'PATIENT_NOT_SCHEDULABLE',
        message: 'This patient cannot be scheduled for new appointments.',
      });
    }
  }

  private async assertActivePractitioner(
    organizationId: string,
    practitionerId: string,
  ): Promise<void> {
    const practitioner = await this.prisma.practitioner.findFirst({
      where: { id: practitionerId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!practitioner) {
      const exists = await this.prisma.practitioner.findFirst({
        where: { id: practitionerId, organizationId },
        select: { id: true, status: true },
      });
      if (!exists) {
        throw new NotFoundException({
          code: 'PRACTITIONER_NOT_FOUND',
          message: 'Practitioner was not found.',
        });
      }
      throw new BadRequestException({
        code: 'PRACTITIONER_NOT_AVAILABLE',
        message: 'Practitioner is not available for new appointments.',
      });
    }
  }

  private async assertAppointmentType(
    organizationId: string,
    appointmentTypeId: string | null,
  ): Promise<void> {
    if (appointmentTypeId == null) {
      return;
    }
    const type = await this.prisma.appointmentType.findFirst({
      where: { id: appointmentTypeId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!type) {
      throw new NotFoundException({
        code: 'APPOINTMENT_NOT_FOUND',
        message: 'Appointment type was not found.',
      });
    }
  }

  private async assertLocation(
    organizationId: string,
    locationId: string | null,
  ): Promise<void> {
    if (locationId == null) {
      return;
    }
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!location) {
      throw new NotFoundException({
        code: 'APPOINTMENT_NOT_FOUND',
        message: 'Location was not found.',
      });
    }
  }

  private async assertRoom(
    organizationId: string,
    locationId: string | null,
    roomId: string | null,
  ): Promise<void> {
    if (roomId == null) {
      return;
    }
    if (locationId == null) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Location is required when a room is selected.',
      });
    }
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        organizationId,
        locationId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!room) {
      throw new NotFoundException({
        code: 'APPOINTMENT_NOT_FOUND',
        message: 'Room was not found.',
      });
    }
  }

  private async applyVersionedUpdate(
    tx: Tx,
    organizationId: string,
    id: string,
    expectedVersion: number,
    data: Prisma.AppointmentUncheckedUpdateManyInput,
  ): Promise<AppointmentWithRelations> {
    const result = await tx.appointment.updateMany({
      where: { id, organizationId, version: expectedVersion },
      data,
    });

    if (result.count !== 1) {
      const stillThere = await tx.appointment.findFirst({
        where: { id, organizationId },
        select: { id: true },
      });
      if (!stillThere) {
        throw new NotFoundException({
          code: 'APPOINTMENT_NOT_FOUND',
          message: 'Appointment was not found.',
        });
      }
      throw new ConflictException({
        code: 'APPOINTMENT_UPDATE_CONFLICT',
        message: 'Appointment was modified by another user. Refresh and retry.',
      });
    }

    const appointment = await tx.appointment.findFirst({
      where: { id, organizationId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) {
      throw new NotFoundException({
        code: 'APPOINTMENT_NOT_FOUND',
        message: 'Appointment was not found.',
      });
    }
    return appointment;
  }

  private rethrowConflict(error: unknown): void {
    if (isPractitionerOverlapError(error) || isPostgresDeadlockError(error)) {
      throw new ConflictException({
        code: 'APPOINTMENT_TIME_CONFLICT',
        message:
          'The selected practitioner already has an appointment during this time. Choose another slot.',
      });
    }
  }

  private isUniqueEncounterError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const maybe = error as { code?: string; meta?: { target?: string[] } };
    return maybe.code === 'P2002' && maybe.meta?.target?.includes('appointmentId') === true;
  }
}
