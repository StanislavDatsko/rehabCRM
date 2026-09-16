import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type {
  ClinicalReportDownloadResponse,
  ClinicalReportListResponse,
  ClinicalReportResponse,
} from '@repo/contracts';
import type { Prisma } from '@prisma/client';
import { writeAuditEvent } from '../common/audit/write-audit';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { StorageService } from '../infrastructure/storage/storage.service';
import { MetricsService } from '../observability/metrics.service';
import { ClinicalReportPdfService } from './clinical-report-pdf';
import { ProgressService } from './progress.service';
import type { CreateClinicalReportBody, VoidClinicalReportBody } from './progress.schemas';

const TEMPLATE_VERSION = 'progress-report-v1';
type ReportRow = Prisma.ClinicalReportGetPayload<{
  include: { generatedBy: { select: { id: true; displayName: true } } };
}>;

function configuration(value: Prisma.JsonValue): ClinicalReportResponse['configuration'] {
  const data = value as { sections?: string[]; professionalSummary?: string | null };
  return {
    sections: (data.sections ?? []) as ClinicalReportResponse['configuration']['sections'],
    professionalSummary: data.professionalSummary ?? null,
  };
}

function response(row: ReportRow): ClinicalReportResponse {
  return {
    id: row.id,
    patientId: row.patientId,
    type: row.type,
    status: row.status,
    period: { from: row.periodFrom.toISOString(), to: row.periodTo.toISOString() },
    configuration: configuration(row.configuration),
    templateVersion: row.templateVersion,
    generatedBy: row.generatedBy,
    createdAt: row.createdAt.toISOString(),
    generatedAt: row.generatedAt?.toISOString() ?? null,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidReason: row.voidReason,
    failureCode: row.failureCode,
  };
}

@Injectable()
export class ClinicalReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly pdf: ClinicalReportPdfService,
    private readonly storage: StorageService,
    private readonly metrics: MetricsService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    patientId: string,
  ): Promise<ClinicalReportListResponse> {
    await this.requirePatient(principal.organizationId, patientId);
    const rows = await this.prisma.clinicalReport.findMany({
      where: { organizationId: principal.organizationId, patientId },
      include: { generatedBy: { select: { id: true, displayName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return { items: rows.map(response) };
  }

  async get(principal: AuthenticatedPrincipal, id: string): Promise<ClinicalReportResponse> {
    return response(await this.requireReport(principal.organizationId, id));
  }

  async create(
    principal: AuthenticatedPrincipal,
    patientId: string,
    body: CreateClinicalReportBody,
    requestId: string,
  ): Promise<ClinicalReportResponse> {
    const startedAt = Date.now();
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId: principal.organizationId },
      select: { firstName: true, lastName: true, middleName: true },
    });
    if (!patient)
      throw new NotFoundException({
        code: 'CLINICAL_REPORT_NOT_FOUND',
        message: 'Patient was not found.',
      });
    const practitioner = await this.prisma.practitioner.findFirst({
      where: {
        organizationId: principal.organizationId,
        userId: principal.userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!practitioner)
      throw new NotFoundException({
        code: 'CLINICAL_REPORT_NOT_FOUND',
        message: 'Practitioner profile was not found.',
      });
    const periodFrom = new Date(body.period.from);
    const periodTo = new Date(body.period.to);
    if (periodFrom > periodTo || periodTo.getTime() - periodFrom.getTime() > 10 * 365 * 86_400_000)
      throw new ConflictException({
        code: 'CLINICAL_REPORT_INVALID_PERIOD',
        message: 'Invalid report period.',
      });
    const initial = await this.prisma.$transaction(async (tx) => {
      const row = await tx.clinicalReport.create({
        data: {
          organizationId: principal.organizationId,
          patientId,
          status: 'GENERATING',
          periodFrom,
          periodTo,
          configuration: {
            sections: body.sections,
            professionalSummary: body.professionalSummary,
          } satisfies Prisma.InputJsonValue,
          sourceSnapshotMetadata: { capturedAt: new Date().toISOString(), pending: true },
          generatedByPractitionerId: practitioner.id,
          generatedByUserId: principal.userId,
          templateVersion: TEMPLATE_VERSION,
        },
      });
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'CLINICAL_REPORT_CREATED',
        entityType: 'ClinicalReport',
        entityId: row.id,
        requestId,
        metadata: {
          patientId,
          type: 'PROGRESS',
          periodFrom: body.period.from,
          periodTo: body.period.to,
          sectionCount: body.sections.length,
        },
      });
      return row;
    });
    try {
      const query = { period: 'custom' as const, from: body.period.from, to: body.period.to };
      const [summary, measurements, goals, planHistory, annotations, organization, snapshot] =
        await Promise.all([
          this.progress.summary(principal, patientId, query),
          this.progress.measurements(principal, patientId, query),
          this.progress.goals(principal, patientId, query),
          this.progress.planHistory(principal, patientId, query),
          this.progress.bodyAnnotations(principal, patientId, query),
          this.prisma.organization.findUniqueOrThrow({
            where: { id: principal.organizationId },
            select: { name: true },
          }),
          this.snapshot(principal.organizationId, patientId, periodFrom, periodTo),
        ]);
      const buffer = await this.pdf.render({
        organizationName: organization.name,
        patientName: [patient.lastName, patient.firstName, patient.middleName]
          .filter(Boolean)
          .join(' '),
        period: body.period,
        generatedAt: new Date(),
        generatedBy: principal.displayName,
        professionalSummary: body.professionalSummary,
        sections: body.sections,
        summary,
        measurements,
        goals,
        planHistory,
        annotations,
      });
      const storageKey = `clinical-reports/${principal.organizationId}/${patientId}/${initial.id}.pdf`;
      try {
        await this.storage.putPrivateDocument(storageKey, buffer, 'application/pdf');
      } catch (error) {
        this.metrics.recordStorageFailure();
        throw error;
      }
      const completed = await this.prisma.$transaction(async (tx) => {
        const row = await tx.clinicalReport.update({
          where: { id: initial.id },
          data: {
            status: 'COMPLETED',
            storageKey,
            generatedAt: new Date(),
            sourceSnapshotMetadata: snapshot,
          },
        });
        await writeAuditEvent(tx, {
          organizationId: principal.organizationId,
          actorUserId: principal.userId,
          action: 'CLINICAL_REPORT_GENERATED',
          entityType: 'ClinicalReport',
          entityId: initial.id,
          requestId,
          metadata: { patientId, templateVersion: TEMPLATE_VERSION, byteLength: buffer.length },
        });
        return row;
      });
      this.metrics.recordReport('completed', Date.now() - startedAt);
      return response({
        ...completed,
        generatedBy: { id: principal.userId, displayName: principal.displayName },
      });
    } catch {
      this.metrics.recordReport('failed', Date.now() - startedAt);
      await this.prisma.clinicalReport.update({
        where: { id: initial.id },
        data: { status: 'FAILED', failureCode: 'CLINICAL_REPORT_GENERATION_FAILED' },
      });
      throw new InternalServerErrorException({
        code: 'CLINICAL_REPORT_GENERATION_FAILED',
        message: 'Clinical report generation failed.',
      });
    }
  }

  async download(
    principal: AuthenticatedPrincipal,
    id: string,
    requestId: string,
  ): Promise<ClinicalReportDownloadResponse> {
    const report = await this.requireReport(principal.organizationId, id);
    if (report.status !== 'COMPLETED' || !report.storageKey)
      throw new ConflictException({
        code: 'CLINICAL_REPORT_NOT_READY',
        message: 'Clinical report is not ready.',
      });
    let signed: Awaited<ReturnType<StorageService['signDocumentRead']>>;
    try {
      const object = await this.storage.headPrivateObject(report.storageKey);
      if (object.contentType && object.contentType !== 'application/pdf') {
        throw new Error('Clinical report object has an invalid content type.');
      }
      signed = await this.storage.signDocumentRead(
        report.storageKey,
        `rehab-progress-${report.patientId}-${report.id}.pdf`,
      );
    } catch {
      this.metrics.recordStorageFailure();
      throw new InternalServerErrorException({
        code: 'STORAGE_ERROR',
        message: 'Clinical report file is unavailable.',
      });
    }
    await this.prisma.$transaction((tx) =>
      writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'CLINICAL_REPORT_DOWNLOADED',
        entityType: 'ClinicalReport',
        entityId: id,
        requestId,
        metadata: { patientId: report.patientId },
      }),
    );
    return { url: signed.url, expiresAt: signed.expiresAt.toISOString() };
  }

  async void(
    principal: AuthenticatedPrincipal,
    id: string,
    body: VoidClinicalReportBody,
    requestId: string,
  ): Promise<ClinicalReportResponse> {
    const existing = await this.requireReport(principal.organizationId, id);
    if (existing.status === 'VOIDED')
      throw new ConflictException({
        code: 'CLINICAL_REPORT_ALREADY_VOIDED',
        message: 'Clinical report is already voided.',
      });
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.clinicalReport.update({
        where: { id },
        data: {
          status: 'VOIDED',
          voidedAt: new Date(),
          voidedByUserId: principal.userId,
          voidReason: body.reason,
        },
      });
      await writeAuditEvent(tx, {
        organizationId: principal.organizationId,
        actorUserId: principal.userId,
        action: 'CLINICAL_REPORT_VOIDED',
        entityType: 'ClinicalReport',
        entityId: id,
        requestId,
        metadata: { patientId: existing.patientId, reasonProvided: true },
      });
      return updated;
    });
    return response({ ...row, generatedBy: existing.generatedBy });
  }

  private async snapshot(
    organizationId: string,
    patientId: string,
    from: Date,
    to: Date,
  ): Promise<Prisma.InputJsonValue> {
    const [assessments, measurements, plans, annotations] = await Promise.all([
      this.prisma.assessment.findMany({
        where: {
          organizationId,
          patientId,
          status: 'COMPLETED',
          voidedAt: null,
          performedAt: { gte: from, lte: to },
        },
        select: { id: true, version: true, updatedAt: true },
      }),
      this.prisma.measurement.findMany({
        where: {
          organizationId,
          patientId,
          performedAt: { gte: from, lte: to },
          assessment: { status: 'COMPLETED', voidedAt: null },
        },
        select: { id: true, assessmentId: true, performedAt: true },
      }),
      this.prisma.rehabilitationPlan.findMany({
        where: { organizationId, patientId },
        select: {
          id: true,
          version: true,
          currentRevisionId: true,
          revisions: {
            where: { status: 'PUBLISHED' },
            select: {
              id: true,
              revisionNumber: true,
              createdAt: true,
              goals: { select: { id: true, updatedAt: true } },
            },
          },
        },
      }),
      this.prisma.bodyAnnotation.findMany({
        where: {
          organizationId,
          patientId,
          createdAt: { lte: to },
          OR: [{ resolvedAt: null }, { resolvedAt: { gte: from } }],
        },
        select: { id: true, version: true, updatedAt: true, status: true },
      }),
    ]);
    return JSON.parse(
      JSON.stringify({
        capturedAt: new Date().toISOString(),
        templateVersion: TEMPLATE_VERSION,
        assessments,
        measurements,
        plans,
        annotations,
      }),
    ) as Prisma.InputJsonValue;
  }

  private async requirePatient(organizationId: string, patientId: string): Promise<void> {
    if (
      !(await this.prisma.patient.findFirst({
        where: { id: patientId, organizationId },
        select: { id: true },
      }))
    )
      throw new NotFoundException({
        code: 'CLINICAL_REPORT_NOT_FOUND',
        message: 'Patient was not found.',
      });
  }
  private async requireReport(organizationId: string, id: string): Promise<ReportRow> {
    const row = await this.prisma.clinicalReport.findFirst({
      where: { id, organizationId },
      include: { generatedBy: { select: { id: true, displayName: true } } },
    });
    if (!row)
      throw new NotFoundException({
        code: 'CLINICAL_REPORT_NOT_FOUND',
        message: 'Clinical report was not found.',
      });
    return row;
  }
}
