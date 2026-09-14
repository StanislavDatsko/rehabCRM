import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AssessmentListItem,
  AssessmentResponse,
  AssessmentTemplateResponse,
  MeasurementHistoryPoint,
} from '@repo/contracts';
import type { MeasurementDefinition, Prisma } from '@prisma/client';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { writeAuditEvent } from '../common/audit/write-audit';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  ASSESSMENT_INCLUDE,
  TEMPLATE_INCLUDE,
  toAssessmentListItem,
  toAssessmentResponse,
  toTemplateResponse,
  type AssessmentWithRelations,
} from './assessment.mapper';
import type {
  AssessmentVersionCommand,
  CreateAssessmentBody,
  ListAssessmentsQuery,
  MeasurementHistoryQuery,
  MeasurementInput,
  UpdateAssessmentBody,
  VoidAssessmentBody,
} from './assessment.schemas';
import { validateMeasurementValue } from './measurement-validation';

type Tx = Prisma.TransactionClient;

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(principal: AuthenticatedPrincipal): Promise<AssessmentTemplateResponse[]> {
    const rows = await this.prisma.assessmentTemplate.findMany({
      where: {
        active: true,
        OR: [{ organizationId: null }, { organizationId: principal.organizationId }],
      },
      include: TEMPLATE_INCLUDE,
      orderBy: [{ name: 'asc' }, { revision: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toTemplateResponse);
  }

  async getTemplate(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<AssessmentTemplateResponse> {
    const row = await this.prisma.assessmentTemplate.findFirst({
      where: {
        id,
        active: true,
        OR: [{ organizationId: null }, { organizationId: principal.organizationId }],
      },
      include: TEMPLATE_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: 'ASSESSMENT_TEMPLATE_NOT_FOUND',
        message: 'Assessment template was not found.',
      });
    }
    return toTemplateResponse(row);
  }

  async listForPatient(
    principal: AuthenticatedPrincipal,
    patientId: string,
    query: ListAssessmentsQuery,
  ): Promise<AssessmentListItem[]> {
    await this.requirePatient(principal.organizationId, patientId);
    const rows = await this.prisma.assessment.findMany({
      where: {
        organizationId: principal.organizationId,
        patientId,
        status: query.status,
        templateId: query.templateId,
        performedAt:
          query.from || query.to
            ? {
                gte: query.from ? new Date(query.from) : undefined,
                lte: query.to ? new Date(query.to) : undefined,
              }
            : undefined,
      },
      include: ASSESSMENT_INCLUDE,
      orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map(toAssessmentListItem);
  }

  async getById(principal: AuthenticatedPrincipal, id: string): Promise<AssessmentResponse> {
    return toAssessmentResponse(await this.requireAssessment(principal.organizationId, id));
  }

  async create(
    principal: AuthenticatedPrincipal,
    patientId: string,
    body: CreateAssessmentBody,
    requestId: string,
  ): Promise<AssessmentResponse> {
    await this.requirePatient(principal.organizationId, patientId);
    const practitioner = await this.requireCurrentPractitioner(principal);

    const encounter = body.encounterId
      ? await this.prisma.encounter.findFirst({
          where: { id: body.encounterId, organizationId: principal.organizationId },
        })
      : null;
    if (body.encounterId && !encounter) {
      throw new NotFoundException({
        code: 'ENCOUNTER_NOT_FOUND',
        message: 'Encounter was not found.',
      });
    }
    if (
      encounter &&
      (encounter.patientId !== patientId || encounter.practitionerId !== practitioner.id)
    ) {
      throw new BadRequestException({
        code: 'ASSESSMENT_ENCOUNTER_MISMATCH',
        message: 'Assessment patient or practitioner does not match the encounter.',
      });
    }

    const template = body.templateId
      ? await this.prisma.assessmentTemplate.findFirst({
          where: {
            id: body.templateId,
            active: true,
            OR: [{ organizationId: null }, { organizationId: principal.organizationId }],
          },
        })
      : null;
    if (body.templateId && !template) {
      throw new NotFoundException({
        code: 'ASSESSMENT_TEMPLATE_NOT_FOUND',
        message: 'Assessment template was not found.',
      });
    }

    const performedAt = body.performedAt
      ? new Date(body.performedAt)
      : (encounter?.startedAt ?? new Date());
    this.assertNotFuture(performedAt);

    const id = await this.prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          organizationId: principal.organizationId,
          patientId,
          encounterId: encounter?.id ?? null,
          practitionerId: practitioner.id,
          templateId: template?.id ?? null,
          title: body.title ?? template?.name ?? 'Оцінювання',
          performedAt,
          createdByUserId: principal.userId,
          updatedByUserId: principal.userId,
        },
        select: { id: true },
      });
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'ASSESSMENT_CREATED',
        entityType: 'Assessment',
        entityId: created.id,
        requestId,
        metadata: {
          patientId,
          encounterId: encounter?.id ?? null,
          templateCode: template?.code ?? null,
        },
      });
      return created.id;
    });
    return this.getById(principal, id);
  }

  async update(
    principal: AuthenticatedPrincipal,
    id: string,
    body: UpdateAssessmentBody,
    requestId: string,
  ): Promise<AssessmentResponse> {
    const existing = await this.requireAssessment(principal.organizationId, id);
    this.assertEditable(existing);
    const performedAt = body.performedAt ? new Date(body.performedAt) : existing.performedAt;
    this.assertNotFuture(performedAt);

    const prepared = body.measurements
      ? await this.prepareMeasurements(principal, existing, body.measurements, performedAt)
      : null;
    const changedFields = [
      ...(body.title !== undefined ? ['title'] : []),
      ...(body.summary !== undefined ? ['summary'] : []),
      ...(body.performedAt !== undefined ? ['performedAt'] : []),
    ];
    const changedCodes = prepared
      ? [...new Set(prepared.map((item) => item.definitionCode))].sort()
      : [];

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.assessment.updateMany({
        where: {
          id,
          organizationId: principal.organizationId,
          status: 'DRAFT',
          version: body.version,
        },
        data: {
          title: body.title,
          summary: body.summary,
          performedAt: body.performedAt ? performedAt : undefined,
          updatedByUserId: principal.userId,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) this.updateConflict();

      if (prepared) {
        await tx.measurement.deleteMany({
          where: { assessmentId: id, organizationId: principal.organizationId },
        });
        if (prepared.length > 0) await tx.measurement.createMany({ data: prepared });
      } else if (body.performedAt) {
        await tx.measurement.updateMany({
          where: { assessmentId: id, organizationId: principal.organizationId },
          data: { performedAt },
        });
      }
      if (changedFields.length > 0) {
        await this.audit(tx, principal, id, requestId, 'ASSESSMENT_UPDATED', { changedFields });
      }
      if (prepared) {
        await this.audit(tx, principal, id, requestId, 'ASSESSMENT_MEASUREMENTS_UPDATED', {
          changedMeasurementCodes: changedCodes,
        });
      }
    });
    return this.getById(principal, id);
  }

  async complete(
    principal: AuthenticatedPrincipal,
    id: string,
    body: AssessmentVersionCommand,
    requestId: string,
  ): Promise<AssessmentResponse> {
    const existing = await this.requireAssessment(principal.organizationId, id);
    if (existing.status !== 'DRAFT') {
      throw new ConflictException({
        code:
          existing.status === 'COMPLETED'
            ? 'ASSESSMENT_ALREADY_COMPLETED'
            : 'ASSESSMENT_INVALID_TRANSITION',
        message: 'Only a draft assessment can be completed.',
      });
    }
    this.assertRequiredMeasurements(existing);
    for (const measurement of existing.measurements) {
      validateMeasurementValue(measurement.definition, {
        definitionId: measurement.definitionId,
        templateItemId: measurement.templateItemId,
        anatomicalRegion: measurement.anatomicalRegionCode as MeasurementInput['anatomicalRegion'],
        laterality: measurement.laterality,
        sequenceNumber: measurement.sequenceNumber,
        value:
          measurement.numericValue ??
          measurement.booleanValue ??
          measurement.codedValue ??
          measurement.textValue ??
          '',
        unit: measurement.unitCodeSnapshot as MeasurementInput['unit'],
        note: measurement.note,
      });
    }

    const completedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.assessment.updateMany({
        where: {
          id,
          organizationId: principal.organizationId,
          status: 'DRAFT',
          version: body.version,
        },
        data: {
          status: 'COMPLETED',
          completedAt,
          updatedByUserId: principal.userId,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) this.updateConflict();
      await this.audit(tx, principal, id, requestId, 'ASSESSMENT_COMPLETED', {
        statusChange: { from: 'DRAFT', to: 'COMPLETED' },
      });
    });
    return this.getById(principal, id);
  }

  async void(
    principal: AuthenticatedPrincipal,
    id: string,
    body: VoidAssessmentBody,
    requestId: string,
  ): Promise<AssessmentResponse> {
    const existing = await this.requireAssessment(principal.organizationId, id);
    if (existing.status === 'VOIDED') {
      throw new ConflictException({
        code: 'ASSESSMENT_INVALID_TRANSITION',
        message: 'Assessment is already voided.',
      });
    }
    const voidedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.assessment.updateMany({
        where: {
          id,
          organizationId: principal.organizationId,
          status: existing.status,
          version: body.version,
        },
        data: {
          status: 'VOIDED',
          voidedAt,
          voidedByUserId: principal.userId,
          voidReason: body.reason,
          updatedByUserId: principal.userId,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) this.updateConflict();
      await this.audit(tx, principal, id, requestId, 'ASSESSMENT_VOIDED', {
        statusChange: { from: existing.status, to: 'VOIDED' },
        reasonRecorded: true,
      });
    });
    return this.getById(principal, id);
  }

  async history(
    principal: AuthenticatedPrincipal,
    patientId: string,
    query: MeasurementHistoryQuery,
  ): Promise<MeasurementHistoryPoint[]> {
    await this.requirePatient(principal.organizationId, patientId);
    const rows = await this.prisma.measurement.findMany({
      where: {
        organizationId: principal.organizationId,
        patientId,
        definitionCode: query.definitionCode,
        anatomicalRegionCode: query.region,
        laterality: query.laterality,
        performedAt:
          query.from || query.to
            ? {
                gte: query.from ? new Date(query.from) : undefined,
                lte: query.to ? new Date(query.to) : undefined,
              }
            : undefined,
        assessment: { status: 'COMPLETED' },
      },
      include: { assessment: { select: { id: true, title: true } } },
      orderBy: [{ performedAt: 'asc' }, { id: 'asc' }],
      take: 500,
    });
    return rows.map((row) => ({
      measurementId: row.id,
      definitionId: row.definitionId,
      assessmentId: row.assessment.id,
      assessmentTitle: row.assessment.title,
      definitionCode: row.definitionCode,
      definitionName: row.definitionName,
      valueType: row.valueTypeSnapshot,
      value: row.numericValue ?? row.booleanValue ?? row.codedValue ?? row.textValue ?? '',
      unit: row.unitCodeSnapshot as MeasurementHistoryPoint['unit'],
      anatomicalRegion: row.anatomicalRegionCode as MeasurementHistoryPoint['anatomicalRegion'],
      laterality: row.laterality,
      sequenceNumber: row.sequenceNumber,
      performedAt: row.performedAt.toISOString(),
    }));
  }

  private async prepareMeasurements(
    principal: AuthenticatedPrincipal,
    assessment: AssessmentWithRelations,
    inputs: MeasurementInput[],
    performedAt: Date,
  ): Promise<Prisma.MeasurementCreateManyInput[]> {
    const definitionIds = [...new Set(inputs.map((input) => input.definitionId))];
    const definitions = await this.prisma.measurementDefinition.findMany({
      where: {
        id: { in: definitionIds },
        OR: [{ organizationId: null }, { organizationId: principal.organizationId }],
      },
    });
    if (definitions.length !== definitionIds.length) {
      throw new NotFoundException({
        code: 'MEASUREMENT_DEFINITION_NOT_FOUND',
        message: 'Measurement definition was not found.',
      });
    }
    const byId = new Map(definitions.map((definition) => [definition.id, definition]));
    const templateItems = new Map(
      (assessment.template?.items ?? []).map((item) => [item.id, item]),
    );
    const occurrenceKeys = new Set<string>();

    return inputs.map((input) => {
      const definition = byId.get(input.definitionId) as MeasurementDefinition;
      const templateItem = input.templateItemId ? templateItems.get(input.templateItemId) : null;
      if (
        input.templateItemId &&
        (!templateItem || templateItem.measurementDefinitionId !== definition.id)
      ) {
        throw new BadRequestException({
          code: 'MEASUREMENT_INVALID_VALUE',
          message: 'Measurement does not match the assessment template.',
        });
      }
      const region = input.anatomicalRegion ?? null;
      const laterality = input.laterality ?? null;
      if (definition.anatomicalApplicability === 'REQUIRED' && (!region || !laterality)) {
        throw new BadRequestException({
          code: 'MEASUREMENT_INVALID_VALUE',
          message: `${definition.code} requires anatomical region and laterality.`,
        });
      }
      if (definition.anatomicalApplicability === 'NOT_APPLICABLE' && region) {
        throw new BadRequestException({
          code: 'MEASUREMENT_INVALID_VALUE',
          message: `${definition.code} does not accept an anatomical region.`,
        });
      }
      const key = `${templateItem?.id ?? definition.id}|${region ?? ''}|${laterality ?? ''}|${input.sequenceNumber}`;
      if (occurrenceKeys.has(key)) {
        throw new BadRequestException({
          code: 'MEASUREMENT_INVALID_VALUE',
          message: 'Duplicate measurement occurrence.',
        });
      }
      occurrenceKeys.add(key);
      const valueColumns = validateMeasurementValue(definition, input);
      return {
        organizationId: principal.organizationId,
        assessmentId: assessment.id,
        patientId: assessment.patientId,
        encounterId: assessment.encounterId,
        definitionId: definition.id,
        templateItemId: templateItem?.id ?? null,
        definitionCode: definition.code,
        definitionName: definition.name,
        categorySnapshot: definition.category,
        valueTypeSnapshot: definition.valueType,
        unitCodeSnapshot: definition.unitCode,
        minimumValueSnapshot: definition.minimumValue,
        maximumValueSnapshot: definition.maximumValue,
        anatomicalRegionCode: region,
        laterality,
        sequenceNumber: input.sequenceNumber,
        ...valueColumns,
        performedAt,
        note: input.note ?? null,
        createdByUserId: principal.userId,
      };
    });
  }

  private assertRequiredMeasurements(assessment: AssessmentWithRelations): void {
    const present = new Set(
      assessment.measurements.map((measurement) => measurement.templateItemId).filter(Boolean),
    );
    const missing = (assessment.template?.items ?? []).filter(
      (item) => item.required && !present.has(item.id),
    );
    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'ASSESSMENT_REQUIRED_MEASUREMENTS_MISSING',
        message: 'Complete required measurements before completing the assessment.',
        details: { definitionCodes: missing.map((item) => item.measurementDefinition.code) },
      });
    }
  }

  private assertEditable(assessment: AssessmentWithRelations): void {
    if (assessment.status !== 'DRAFT') {
      throw new ConflictException({
        code: 'ASSESSMENT_NOT_EDITABLE',
        message: 'Completed or voided assessments cannot be edited.',
      });
    }
  }

  private assertNotFuture(value: Date): void {
    if (value.getTime() > Date.now() + 60_000) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'performedAt cannot be in the future.',
      });
    }
  }

  private updateConflict(): never {
    throw new ConflictException({
      code: 'ASSESSMENT_UPDATE_CONFLICT',
      message: 'Assessment was modified in another tab or by another user. Refresh and retry.',
    });
  }

  private async requireCurrentPractitioner(principal: AuthenticatedPrincipal) {
    const practitioner = await this.prisma.practitioner.findFirst({
      where: {
        organizationId: principal.organizationId,
        userId: principal.userId,
        status: 'ACTIVE',
      },
    });
    if (!practitioner) {
      throw new ForbiddenException({
        code: 'PRACTITIONER_REQUIRED',
        message: 'An active practitioner profile is required.',
      });
    }
    return practitioner;
  }

  private async requirePatient(organizationId: string, patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      select: { id: true },
    });
    if (!patient)
      throw new NotFoundException({ code: 'PATIENT_NOT_FOUND', message: 'Patient was not found.' });
  }

  private async requireAssessment(
    organizationId: string,
    id: string,
  ): Promise<AssessmentWithRelations> {
    const row = await this.prisma.assessment.findFirst({
      where: { id, organizationId },
      include: ASSESSMENT_INCLUDE,
    });
    if (!row)
      throw new NotFoundException({
        code: 'ASSESSMENT_NOT_FOUND',
        message: 'Assessment was not found.',
      });
    return row;
  }

  private audit(
    tx: Tx,
    principal: AuthenticatedPrincipal,
    entityId: string,
    requestId: string,
    action: string,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    return writeAuditEvent(tx, {
      organizationId: principal.organizationId,
      actorUserId: principal.userId,
      action,
      entityType: 'Assessment',
      entityId,
      requestId,
      metadata,
    });
  }
}
