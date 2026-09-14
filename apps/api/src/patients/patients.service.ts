import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  defaultPagination,
  type PatientHistoryItem,
  type PatientListResponse,
  type PatientAdministrativeResponse,
  type ResponsiblePractitionerResponse,
} from '@repo/contracts';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  mapResponsiblePractitioner,
  parseDateOfBirthInput,
  PATIENT_INCLUDE,
  toPatientAdministrativeResponse,
  toPatientHistoryItem,
  type PatientWithPractitioner,
} from './patient.mapper';
import type {
  ChangePatientStatusBody,
  CreatePatientBody,
  ListPatientsQuery,
  UpdatePatientBody,
} from './patient.schemas';
import { normalizePhone } from './phone';

type Tx = Prisma.TransactionClient;

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    principal: AuthenticatedPrincipal,
    query: ListPatientsQuery,
  ): Promise<PatientListResponse> {
    const { page, pageSize } = defaultPagination(query.page, query.pageSize);
    const where = this.buildListWhere(principal.organizationId, query);
    const sortField = query.sort ?? 'lastName';
    const sortDir = query.sortDir ?? 'asc';

    const orderBy: Prisma.PatientOrderByWithRelationInput[] = [
      { [sortField]: sortDir },
      ...(sortField === 'lastName' ? [{ firstName: sortDir as 'asc' | 'desc' }] : []),
      { id: 'asc' },
    ];

    const [total, rows] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        where,
        include: PATIENT_INCLUDE,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => toPatientAdministrativeResponse(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async getById(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<PatientAdministrativeResponse> {
    const patient = await this.requirePatient(principal.organizationId, id);
    return toPatientAdministrativeResponse(patient);
  }

  async create(
    principal: AuthenticatedPrincipal,
    body: CreatePatientBody,
    requestId: string,
  ): Promise<PatientAdministrativeResponse> {
    await this.assertResponsiblePractitioner(
      principal.organizationId,
      body.responsiblePractitionerId ?? null,
    );

    const phone = normalizePhone(body.phone);
    const emergencyPhone = normalizePhone(body.emergencyContact?.phone);

    const created = await this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          organizationId: principal.organizationId,
          firstName: body.firstName,
          lastName: body.lastName,
          middleName: body.middleName ?? null,
          dateOfBirth: parseDateOfBirthInput(body.dateOfBirth),
          sex: body.sex ?? null,
          phoneDisplay: phone.display,
          phoneNormalized: phone.normalized,
          email: body.email ?? null,
          addressLine1: body.address?.line1 ?? null,
          addressLine2: body.address?.line2 ?? null,
          city: body.address?.city ?? null,
          region: body.address?.region ?? null,
          postalCode: body.address?.postalCode ?? null,
          countryCode: body.address?.countryCode ?? null,
          emergencyContactName: body.emergencyContact?.name ?? null,
          emergencyContactPhoneDisplay: emergencyPhone.display,
          emergencyContactPhoneNormalized: emergencyPhone.normalized,
          emergencyContactRelationship: body.emergencyContact?.relationship ?? null,
          responsiblePractitionerId: body.responsiblePractitionerId ?? null,
          internalReferenceNumber: body.internalReferenceNumber ?? null,
          createdByUserId: principal.userId,
          updatedByUserId: principal.userId,
        },
        include: PATIENT_INCLUDE,
      });

      await this.writeAudit(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'PATIENT_CREATED',
        entityId: patient.id,
        requestId,
        metadata: { changedFields: ['*'] },
      });

      return patient;
    });

    return toPatientAdministrativeResponse(created);
  }

  async updateAdministrative(
    principal: AuthenticatedPrincipal,
    id: string,
    body: UpdatePatientBody,
    requestId: string,
  ): Promise<PatientAdministrativeResponse> {
    const existing = await this.requirePatient(principal.organizationId, id);

    if (body.responsiblePractitionerId !== undefined) {
      await this.assertResponsiblePractitioner(
        principal.organizationId,
        body.responsiblePractitionerId,
      );
    }

    const data = this.buildUpdateData(existing, body, principal.userId);
    const changedFields = Object.keys(data).filter(
      (key) => key !== 'updatedByUserId' && key !== 'version',
    );

    if (changedFields.length === 0) {
      return toPatientAdministrativeResponse(existing);
    }

    const practitionerChanged = Object.prototype.hasOwnProperty.call(
      data,
      'responsiblePractitionerId',
    );
    const adminChangedFields = changedFields.filter(
      (field) => field !== 'responsiblePractitionerId',
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const patient = await this.applyVersionedUpdate(
        tx,
        principal.organizationId,
        id,
        body.version,
        { ...data, version: { increment: 1 } },
      );

      if (adminChangedFields.length > 0) {
        await this.writeAudit(tx, {
          organizationId: principal.organizationId,
          actorUserId: principal.userId,
          action: 'PATIENT_ADMINISTRATIVE_UPDATED',
          entityId: id,
          requestId,
          metadata: {
            changedFields: [
              ...new Set(adminChangedFields.map((field) => this.toPublicFieldName(field))),
            ],
          },
        });
      }

      if (practitionerChanged) {
        await this.writeAudit(tx, {
          organizationId: principal.organizationId,
          actorUserId: principal.userId,
          action: 'PATIENT_RESPONSIBLE_PRACTITIONER_CHANGED',
          entityId: id,
          requestId,
          metadata: {
            changedFields: ['responsiblePractitionerId'],
          },
        });
      }

      return patient;
    });

    return toPatientAdministrativeResponse(updated);
  }

  async changeStatus(
    principal: AuthenticatedPrincipal,
    id: string,
    body: ChangePatientStatusBody,
    requestId: string,
  ): Promise<PatientAdministrativeResponse> {
    const existing = await this.requirePatient(principal.organizationId, id);
    if (existing.status === body.status) {
      return toPatientAdministrativeResponse(existing);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const patient = await this.applyVersionedUpdate(
        tx,
        principal.organizationId,
        id,
        body.version,
        {
          status: body.status,
          updatedByUserId: principal.userId,
          version: { increment: 1 },
        },
      );

      await this.writeAudit(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'PATIENT_STATUS_CHANGED',
        entityId: id,
        requestId,
        metadata: {
          changedFields: ['status'],
          statusChange: { from: existing.status, to: body.status },
        },
      });

      return patient;
    });

    return toPatientAdministrativeResponse(updated);
  }

  async history(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<PatientHistoryItem[]> {
    await this.requirePatient(principal.organizationId, id);

    const events = await this.prisma.auditEvent.findMany({
      where: {
        organizationId: principal.organizationId,
        entityType: 'Patient',
        entityId: id,
      },
      include: {
        actor: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });

    return events.map(toPatientHistoryItem);
  }

  async listPractitioners(
    principal: AuthenticatedPrincipal,
  ): Promise<ResponsiblePractitionerResponse[]> {
    const rows = await this.prisma.practitioner.findMany({
      where: {
        organizationId: principal.organizationId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: { displayName: true },
        },
      },
      orderBy: {
        user: {
          displayName: 'asc',
        },
      },
    });

    return rows.map((row) => mapResponsiblePractitioner(row)!);
  }

  private buildListWhere(
    organizationId: string,
    query: ListPatientsQuery,
  ): Prisma.PatientWhereInput {
    const where: Prisma.PatientWhereInput = { organizationId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.responsiblePractitionerId) {
      where.responsiblePractitionerId = query.responsiblePractitionerId;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { middleName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneDisplay: { contains: search, mode: 'insensitive' } },
        { phoneNormalized: { contains: search } },
        { internalReferenceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async requirePatient(
    organizationId: string,
    id: string,
  ): Promise<PatientWithPractitioner> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, organizationId },
      include: PATIENT_INCLUDE,
    });
    if (!patient) {
      throw new NotFoundException({
        code: 'PATIENT_NOT_FOUND',
        message: 'Patient was not found.',
      });
    }
    return patient;
  }

  private async assertResponsiblePractitioner(
    organizationId: string,
    practitionerId: string | null,
  ): Promise<void> {
    if (practitionerId == null) {
      return;
    }

    const practitioner = await this.prisma.practitioner.findFirst({
      where: {
        id: practitionerId,
        organizationId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!practitioner) {
      throw new BadRequestException({
        code: 'RESPONSIBLE_PRACTITIONER_NOT_FOUND',
        message: 'Responsible practitioner is not available.',
      });
    }
  }

  private buildUpdateData(
    existing: PatientWithPractitioner,
    body: UpdatePatientBody,
    userId: string,
  ): Prisma.PatientUncheckedUpdateManyInput {
    const data: Prisma.PatientUncheckedUpdateManyInput = {
      updatedByUserId: userId,
    };

    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.middleName !== undefined) data.middleName = body.middleName;
    if (body.dateOfBirth !== undefined) {
      data.dateOfBirth = parseDateOfBirthInput(body.dateOfBirth);
    }
    if (body.sex !== undefined) data.sex = body.sex;
    if (body.email !== undefined) data.email = body.email;
    if (body.internalReferenceNumber !== undefined) {
      data.internalReferenceNumber = body.internalReferenceNumber;
    }
    if (body.responsiblePractitionerId !== undefined) {
      data.responsiblePractitionerId = body.responsiblePractitionerId;
    }

    if (body.phone !== undefined) {
      const phone = normalizePhone(body.phone);
      data.phoneDisplay = phone.display;
      data.phoneNormalized = phone.normalized;
    }

    if (body.address !== undefined) {
      data.addressLine1 = body.address.line1 ?? null;
      data.addressLine2 = body.address.line2 ?? null;
      data.city = body.address.city ?? null;
      data.region = body.address.region ?? null;
      data.postalCode = body.address.postalCode ?? null;
      data.countryCode = body.address.countryCode ?? null;
    }

    if (body.emergencyContact !== undefined) {
      if (body.emergencyContact === null) {
        data.emergencyContactName = null;
        data.emergencyContactPhoneDisplay = null;
        data.emergencyContactPhoneNormalized = null;
        data.emergencyContactRelationship = null;
      } else {
        const emergencyPhone = normalizePhone(body.emergencyContact.phone);
        data.emergencyContactName = body.emergencyContact.name ?? null;
        data.emergencyContactPhoneDisplay = emergencyPhone.display;
        data.emergencyContactPhoneNormalized = emergencyPhone.normalized;
        data.emergencyContactRelationship = body.emergencyContact.relationship ?? null;
      }
    }

    // Drop no-op writes so changedFields stays accurate.
    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      if (key === 'updatedByUserId') continue;
      const next = data[key];
      const current = existing[key as keyof PatientWithPractitioner];
      if (next instanceof Date && current instanceof Date) {
        if (next.getTime() === current.getTime()) {
          delete data[key];
        }
        continue;
      }
      if (next === current) {
        delete data[key];
      }
    }

    if (Object.keys(data).length === 1 && data.updatedByUserId) {
      return {};
    }

    return data;
  }

  private async applyVersionedUpdate(
    tx: Tx,
    organizationId: string,
    id: string,
    expectedVersion: number,
    data: Prisma.PatientUncheckedUpdateManyInput,
  ): Promise<PatientWithPractitioner> {
    const result = await tx.patient.updateMany({
      where: { id, organizationId, version: expectedVersion },
      data,
    });

    if (result.count !== 1) {
      const stillThere = await tx.patient.findFirst({
        where: { id, organizationId },
        select: { id: true },
      });
      if (!stillThere) {
        throw new NotFoundException({
          code: 'PATIENT_NOT_FOUND',
          message: 'Patient was not found.',
        });
      }
      throw new ConflictException({
        code: 'PATIENT_UPDATE_CONFLICT',
        message: 'Patient was modified by another user. Refresh and retry.',
      });
    }

    const patient = await tx.patient.findFirst({
      where: { id, organizationId },
      include: PATIENT_INCLUDE,
    });
    if (!patient) {
      throw new NotFoundException({
        code: 'PATIENT_NOT_FOUND',
        message: 'Patient was not found.',
      });
    }
    return patient;
  }

  private async writeAudit(
    tx: Tx,
    input: {
      organizationId: string;
      actorUserId: string;
      action:
        | 'PATIENT_CREATED'
        | 'PATIENT_ADMINISTRATIVE_UPDATED'
        | 'PATIENT_STATUS_CHANGED'
        | 'PATIENT_RESPONSIBLE_PRACTITIONER_CHANGED';
      entityId: string;
      requestId: string;
      metadata: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: 'Patient',
        entityId: input.entityId,
        requestId: input.requestId.slice(0, 100),
        metadata: input.metadata,
      },
    });
  }

  private toPublicFieldName(field: string): string {
    switch (field) {
      case 'phoneDisplay':
      case 'phoneNormalized':
        return 'phone';
      case 'emergencyContactPhoneDisplay':
      case 'emergencyContactPhoneNormalized':
        return 'emergencyContact.phone';
      case 'emergencyContactName':
        return 'emergencyContact.name';
      case 'emergencyContactRelationship':
        return 'emergencyContact.relationship';
      case 'addressLine1':
        return 'address.line1';
      case 'addressLine2':
        return 'address.line2';
      case 'postalCode':
        return 'address.postalCode';
      case 'countryCode':
        return 'address.countryCode';
      case 'city':
        return 'address.city';
      case 'region':
        return 'address.region';
      default:
        return field;
    }
  }
}
