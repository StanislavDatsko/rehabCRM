import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { progressQuerySchema } from '../progress/progress.schemas';

export type PatientPortalMeResponse = {
  patient: { reference: string | null; firstName: string; lastName: string; dateOfBirth: string | null };
  portal: { status: 'ACTIVE' };
  organization: { name: string };
};

export type PatientPortalPlanResponse = {
  title: string; description: string | null; status: string; startDate: string;
  expectedEndDate: string | null;
  goals: Array<{ title: string; description: string | null; status: string; targetDate: string | null }>;
  phases: Array<{ name: string; description: string | null; expectedStart: string | null; expectedEnd: string | null; criteria: string | null }>;
  exercises: Array<{ name: string; laterality: string | null; dosage: Record<string, number | string | null>; instructions: string | null; precautions: string | null }>;
};

export type PatientPortalProgressResponse = { measurements: unknown[]; goals: unknown[]; summary: Record<string, unknown> };

@Injectable()
export class PatientPortalService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly progressService?: ProgressService) {}

  async me(principal: AuthenticatedPrincipal): Promise<PatientPortalMeResponse> {
    if (principal.role !== 'PATIENT' || !principal.patientId || !principal.portalAccountId) {
      throw new NotFoundException('Patient portal context was not found.');
    }
    const account = await this.prisma.patientPortalAccount.findFirst({
      where: { id: principal.portalAccountId, patientId: principal.patientId, organizationId: principal.organizationId, status: 'ACTIVE' },
      select: {
        status: true,
        patient: { select: { firstName: true, lastName: true, dateOfBirth: true, internalReferenceNumber: true, organizationId: true } },
        organization: { select: { name: true } },
      },
    });
    if (!account || account.patient.organizationId !== principal.organizationId) {
      throw new NotFoundException('Patient portal context was not found.');
    }
    return {
      patient: { reference: account.patient.internalReferenceNumber, firstName: account.patient.firstName, lastName: account.patient.lastName, dateOfBirth: account.patient.dateOfBirth?.toISOString().slice(0, 10) ?? null },
      portal: { status: 'ACTIVE' }, organization: { name: account.organization.name },
    };
  }

  private async context(principal: AuthenticatedPrincipal) {
    if (principal.role !== 'PATIENT' || !principal.patientId || !principal.portalAccountId) throw new NotFoundException('Patient portal context was not found.');
    const account = await this.prisma.patientPortalAccount.findFirst({ where: { id: principal.portalAccountId, patientId: principal.patientId, organizationId: principal.organizationId, status: 'ACTIVE', patient: { organizationId: principal.organizationId } }, select: { patientId: true, organizationId: true } });
    if (!account) throw new NotFoundException('Patient portal context was not found.');
    return account;
  }

  async plan(principal: AuthenticatedPrincipal): Promise<PatientPortalPlanResponse | null> {
    const context = await this.context(principal);
    const plan = await this.prisma.rehabilitationPlan.findFirst({
      where: { organizationId: context.organizationId, patientId: context.patientId, status: { in: ['ACTIVE', 'PAUSED'] }, currentRevisionId: { not: null } },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      select: { status: true, currentRevision: { select: {
        title: true, description: true, startDate: true, expectedEndDate: true,
        goals: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], select: { title: true, description: true, status: true, targetDate: true } },
        phases: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], select: { name: true, description: true, expectedStart: true, expectedEnd: true, criteria: true } },
        prescriptions: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], select: { exerciseNameSnapshot: true, laterality: true, sets: true, repetitions: true, trials: true, durationSeconds: true, holdSeconds: true, frequencyType: true, sessionsPerDay: true, daysPerWeek: true, instructionsOverride: true, precautions: true } },
      } } },
    });
    const revision = plan?.currentRevision;
    if (!plan || !revision) return null;
    return { title: revision.title, description: revision.description, status: plan.status, startDate: revision.startDate.toISOString().slice(0, 10), expectedEndDate: revision.expectedEndDate?.toISOString().slice(0, 10) ?? null, goals: revision.goals.map((g) => ({ ...g, targetDate: g.targetDate?.toISOString().slice(0, 10) ?? null })), phases: revision.phases.map((p) => ({ ...p, expectedStart: p.expectedStart?.toISOString().slice(0, 10) ?? null, expectedEnd: p.expectedEnd?.toISOString().slice(0, 10) ?? null })), exercises: revision.prescriptions.map((p) => ({ name: p.exerciseNameSnapshot, laterality: p.laterality, dosage: { sets: p.sets, repetitions: p.repetitions, trials: p.trials, durationSeconds: p.durationSeconds, holdSeconds: p.holdSeconds, frequencyType: p.frequencyType, sessionsPerDay: p.sessionsPerDay, daysPerWeek: p.daysPerWeek }, instructions: p.instructionsOverride, precautions: p.precautions })) };
  }

  async progress(principal: AuthenticatedPrincipal): Promise<PatientPortalProgressResponse> {
    const context = await this.context(principal);
    if (this.progressService) {
      const query = progressQuerySchema.parse({});
      const [measurements, goals, summary] = await Promise.all([
        this.progressService.measurements(principal, context.patientId, query),
        this.progressService.goals(principal, context.patientId, query),
        this.progressService.summary(principal, context.patientId, query),
      ]);
      return {
        measurements: measurements.series.map((series) => ({ definition: series.definition.name, unit: series.unit, baseline: series.baseline, latest: series.latest, deltaFromBaseline: series.deltaFromBaseline, points: series.points })),
        goals: goals.goals.map(({ id: _id, planId: _planId, planRevisionId: _revisionId, planRevisionNumber: _revisionNumber, ...goal }) => goal),
        summary: { currentPlan: summary.currentPlan, latestClinicalActivityAt: summary.latestClinicalActivityAt, counts: summary.counts },
      };
    }
    const [measurements, goals, summary] = await Promise.all([
      this.prisma.measurement.findMany({ where: { organizationId: context.organizationId, patientId: context.patientId, numericValue: { not: null }, assessment: { status: 'COMPLETED', voidedAt: null } }, orderBy: [{ performedAt: 'desc' }, { id: 'desc' }], take: 50, select: { definitionName: true, numericValue: true, unitCodeSnapshot: true, performedAt: true } }),
      this.prisma.rehabilitationGoal.findMany({ where: { organizationId: context.organizationId, planRevision: { plan: { patientId: context.patientId, organizationId: context.organizationId, currentRevisionId: { not: null } } } }, orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], select: { title: true, status: true } }),
      this.prisma.patient.findUnique({ where: { id: context.patientId }, select: { createdAt: true } }),
    ]);
    return { measurements: measurements.map((m) => ({ name: m.definitionName, value: m.numericValue, unit: m.unitCodeSnapshot, performedAt: m.performedAt.toISOString() })), goals, summary: { since: summary?.createdAt.toISOString() ?? null } };
  }
}
