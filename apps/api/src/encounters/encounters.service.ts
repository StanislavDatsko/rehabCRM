import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EncounterResponse } from '@repo/contracts';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { writeAuditEvent } from '../common/audit/write-audit';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { canTransitionAppointment } from '../appointments/appointment-transitions';
import {
  ENCOUNTER_INCLUDE,
  toEncounterResponse,
  type EncounterWithRelations,
} from '../appointments/appointment.mapper';

@Injectable()
export class EncountersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<EncounterResponse> {
    const encounter = await this.requireEncounter(principal.organizationId, id);
    return toEncounterResponse(encounter);
  }

  async complete(
    principal: AuthenticatedPrincipal,
    id: string,
    requestId: string,
  ): Promise<EncounterResponse> {
    const existing = await this.requireEncounter(principal.organizationId, id);

    if (existing.status === 'COMPLETED') {
      return toEncounterResponse(existing);
    }

    if (existing.status !== 'IN_PROGRESS') {
      throw new BadRequestException({
        code: 'ENCOUNTER_INVALID_TRANSITION',
        message: 'Only an in-progress encounter can be completed.',
      });
    }

    const endedAt = new Date();
    const appointmentId = existing.appointmentId;

    const updated = await this.prisma.$transaction(async (tx) => {
      const encounter = await tx.encounter.update({
        where: { id: existing.id },
        data: {
          status: 'COMPLETED',
          endedAt,
          updatedByUserId: principal.userId,
        },
        include: ENCOUNTER_INCLUDE,
      });

      if (appointmentId) {
        const appointment = await tx.appointment.findFirst({
          where: { id: appointmentId, organizationId: principal.organizationId },
          select: { id: true, status: true, version: true },
        });

        if (appointment && canTransitionAppointment(appointment.status, 'COMPLETED')) {
          const result = await tx.appointment.updateMany({
            where: {
              id: appointment.id,
              organizationId: principal.organizationId,
              version: appointment.version,
            },
            data: {
              status: 'COMPLETED',
              updatedByUserId: principal.userId,
              version: { increment: 1 },
            },
          });

          if (result.count !== 1) {
            throw new ConflictException({
              code: 'APPOINTMENT_UPDATE_CONFLICT',
              message: 'Appointment was modified by another user. Refresh and retry.',
            });
          }

          await writeAuditEvent(tx, {
            organizationId: principal.organizationId,
            actorUserId: principal.userId,
            action: 'APPOINTMENT_COMPLETED',
            entityType: 'Appointment',
            entityId: appointment.id,
            requestId,
            metadata: {
              changedFields: ['status'],
              statusChange: { from: appointment.status, to: 'COMPLETED' },
              encounterId: encounter.id,
            },
          });
        }
      }

      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'ENCOUNTER_COMPLETED',
        entityType: 'Encounter',
        entityId: encounter.id,
        requestId,
        metadata: {
          endedAt: endedAt.toISOString(),
          appointmentId,
        },
      });

      return encounter;
    });

    return toEncounterResponse(updated);
  }

  private async requireEncounter(
    organizationId: string,
    id: string,
  ): Promise<EncounterWithRelations> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, organizationId },
      include: ENCOUNTER_INCLUDE,
    });
    if (!encounter) {
      throw new NotFoundException({
        code: 'ENCOUNTER_NOT_FOUND',
        message: 'Encounter was not found.',
      });
    }
    return encounter;
  }
}
