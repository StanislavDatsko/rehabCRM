import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  BodyAnnotationProgressResponse,
  ClinicalTimelineItem,
  ClinicalTimelineResponse,
  GoalProgressResponse,
  MeasurementTrendPoint,
  MeasurementTrendsResponse,
  PlanHistoryItem,
  ProgressPeriodResponse,
  ProgressSummaryResponse,
} from '@repo/contracts';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { diffPlanRevisions, type DiffableRevision } from './progress-diff';
import { resolveProgressPeriod } from './progress-period';
import type { ProgressQuery, TimelineQuery } from './progress.schemas';

const toPoint = (row: { id: string; numericValue: number | null; performedAt: Date; assessmentId: string; encounterId: string | null }): MeasurementTrendPoint => ({
  id: row.id, value: row.numericValue!, performedAt: row.performedAt.toISOString(), assessmentId: row.assessmentId, encounterId: row.encounterId,
});
const newest = (values: Array<Date | null | undefined>) => values.filter((v): v is Date => Boolean(v)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  private async context(principal: AuthenticatedPrincipal, patientId: string, query: ProgressQuery): Promise<{ period: ProgressPeriodResponse; currentPlan: Awaited<ReturnType<ProgressService['currentPlan']>> }> {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId: principal.organizationId }, select: { createdAt: true } });
    if (!patient) throw new NotFoundException({ code: 'PROGRESS_NOT_FOUND', message: 'Patient progress was not found.' });
    const currentPlan = await this.currentPlan(principal.organizationId, patientId);
    const start = currentPlan?.currentRevision?.startDate ?? null;
    return { period: resolveProgressPeriod(query, new Date(), patient.createdAt, start), currentPlan };
  }

  private currentPlan(organizationId: string, patientId: string) {
    return this.prisma.rehabilitationPlan.findFirst({
      where: { organizationId, patientId, status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: { currentRevision: { select: { id: true, title: true, revisionNumber: true, startDate: true } } },
    });
  }

  async measurements(principal: AuthenticatedPrincipal, patientId: string, query: ProgressQuery): Promise<MeasurementTrendsResponse> {
    const { period } = await this.context(principal, patientId, query);
    const rows = await this.prisma.measurement.findMany({
      where: {
        organizationId: principal.organizationId, patientId, numericValue: { not: null },
        valueTypeSnapshot: { in: ['NUMBER', 'INTEGER', 'SCALE'] },
        performedAt: { gte: new Date(period.from), lte: new Date(period.to) },
        assessment: { status: 'COMPLETED', voidedAt: null },
      },
      orderBy: [{ performedAt: 'asc' }, { id: 'asc' }],
      select: { id: true, numericValue: true, performedAt: true, assessmentId: true, encounterId: true, definitionId: true, definitionCode: true, definitionName: true, categorySnapshot: true, unitCodeSnapshot: true, anatomicalRegionCode: true, laterality: true },
    });
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = [row.definitionId, row.anatomicalRegionCode ?? '-', row.laterality ?? '-'].join('|');
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return {
      period,
      series: [...groups.entries()].map(([key, points]) => {
        const baseline = toPoint(points[0]!);
        const latest = toPoint(points.at(-1)!);
        return {
          key,
          definition: { id: points[0]!.definitionId, code: points[0]!.definitionCode, name: points[0]!.definitionName, category: points[0]!.categorySnapshot },
          region: points[0]!.anatomicalRegionCode,
          laterality: points[0]!.laterality,
          unit: points[0]!.unitCodeSnapshot,
          baseline, latest, deltaFromBaseline: latest.value - baseline.value, points: points.map(toPoint),
        };
      }),
    };
  }

  async goals(principal: AuthenticatedPrincipal, patientId: string, query: ProgressQuery): Promise<GoalProgressResponse> {
    const { period } = await this.context(principal, patientId, query);
    const plans = await this.prisma.rehabilitationPlan.findMany({
      where: { organizationId: principal.organizationId, patientId, currentRevisionId: { not: null } },
      select: { id: true, currentRevision: { select: { id: true, revisionNumber: true, goals: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] } } } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    const result: GoalProgressResponse['goals'] = [];
    for (const plan of plans) for (const goal of plan.currentRevision?.goals ?? []) {
      const current = goal.measurementDefinitionId ? await this.prisma.measurement.findFirst({
        where: { organizationId: principal.organizationId, patientId, definitionId: goal.measurementDefinitionId, anatomicalRegionCode: goal.anatomicalRegionCode, laterality: goal.laterality, numericValue: { not: null }, performedAt: { gte: new Date(period.from), lte: new Date(period.to) }, assessment: { status: 'COMPLETED', voidedAt: null } },
        orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
      }) : null;
      const target = goal.targetOperator && goal.targetValue !== null ? { operator: goal.targetOperator, value: goal.targetValue, upperValue: goal.targetValueUpper, unit: goal.targetUnitCode } : null;
      let targetConditionMet: boolean | null = null;
      if (target && current?.numericValue !== null && current?.numericValue !== undefined) {
        const value = current.numericValue;
        targetConditionMet = target.operator === 'GREATER_THAN_OR_EQUAL' ? value >= target.value : target.operator === 'LESS_THAN_OR_EQUAL' ? value <= target.value : target.operator === 'EQUAL' ? value === target.value : target.upperValue !== null && value >= target.value && value <= target.upperValue;
      }
      result.push({
        id: goal.id, planId: plan.id, planRevisionId: plan.currentRevision!.id, planRevisionNumber: plan.currentRevision!.revisionNumber,
        title: goal.title, status: goal.status, region: goal.anatomicalRegionCode, laterality: goal.laterality,
        baseline: goal.baselineNumericValueSnapshot !== null && goal.baselinePerformedAt ? { value: goal.baselineNumericValueSnapshot, unit: goal.baselineUnitCodeSnapshot, performedAt: goal.baselinePerformedAt.toISOString() } : null,
        current: current?.numericValue !== null && current?.numericValue !== undefined ? { value: current.numericValue, unit: current.unitCodeSnapshot, performedAt: current.performedAt.toISOString(), measurementId: current.id } : null,
        target, targetConditionMet,
      });
    }
    return { period, goals: result };
  }

  async planHistory(principal: AuthenticatedPrincipal, patientId: string, query: ProgressQuery): Promise<PlanHistoryItem[]> {
    const { period } = await this.context(principal, patientId, query);
    const plans = await this.prisma.rehabilitationPlan.findMany({
      where: { organizationId: principal.organizationId, patientId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, status: true, revisions: { where: { status: 'PUBLISHED' }, orderBy: [{ revisionNumber: 'asc' }, { id: 'asc' }], include: { goals: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] }, phases: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] }, prescriptions: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] } } } },
    });
    const items: PlanHistoryItem[] = [];
    for (const plan of plans) {
      let previous: DiffableRevision | null = null;
      for (const revision of plan.revisions) {
        const current: DiffableRevision = {
          goals: revision.goals.map((g) => ({ title: g.title, status: g.status, target: [g.targetOperator, g.targetValue, g.targetValueUpper, g.targetUnitCode].join('|') })),
          phases: revision.phases.map((p) => ({ name: p.name, criteria: p.criteria, dates: `${p.expectedStart?.toISOString() ?? ''}|${p.expectedEnd?.toISOString() ?? ''}` })),
          exercises: revision.prescriptions.map((p) => ({ code: p.exerciseCodeSnapshot, name: p.exerciseNameSnapshot, dosage: [p.sets, p.repetitions, p.trials, p.durationSeconds, p.holdSeconds, p.distanceMeters, p.loadKg, p.frequencyType, p.sessionsPerDay, p.daysPerWeek].join('|') })),
        };
        items.push({ planId: plan.id, planStatus: plan.status, revisionId: revision.id, revisionNumber: revision.revisionNumber, title: revision.title, effectiveFrom: revision.effectiveFrom?.toISOString() ?? null, createdAt: revision.createdAt.toISOString(), changeSummary: revision.changeSummary, diffFromPrevious: previous ? diffPlanRevisions(previous, current) : null });
        previous = current;
      }
    }
    return items
      .filter((item) => { const occurredAt = item.effectiveFrom ?? item.createdAt; return occurredAt >= period.from && occurredAt <= period.to; })
      .sort((a, b) => (b.effectiveFrom ?? b.createdAt).localeCompare(a.effectiveFrom ?? a.createdAt) || b.revisionId.localeCompare(a.revisionId));
  }

  async bodyAnnotations(principal: AuthenticatedPrincipal, patientId: string, query: ProgressQuery): Promise<BodyAnnotationProgressResponse> {
    const { period } = await this.context(principal, patientId, query);
    const rows = await this.prisma.bodyAnnotation.findMany({
      where: { organizationId: principal.organizationId, patientId, status: { not: 'VOIDED' }, createdAt: { lte: new Date(period.to) }, OR: [{ resolvedAt: null }, { resolvedAt: { gte: new Date(period.from) } }] },
      include: { structure: { select: { id: true, code: true, canonicalName: true, regionCode: true, laterality: true } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const groups = new Map<string, typeof rows>();
    for (const row of rows) { const key = `${row.structureId}|${row.type}`; groups.set(key, [...(groups.get(key) ?? []), row]); }
    return { period, groups: [...groups.values()].map((group) => ({
      structure: { id: group[0]!.structure.id, code: group[0]!.structure.code, name: group[0]!.structure.canonicalName, region: group[0]!.structure.regionCode, laterality: group[0]!.structure.laterality },
      type: group[0]!.type, activeCount: group.filter((x) => x.status === 'ACTIVE').length, resolvedCount: group.filter((x) => x.status === 'RESOLVED').length,
      latestSeverity: group.at(-1)!.severity, firstObservedAt: group[0]!.createdAt.toISOString(), lastObservedAt: (group.at(-1)!.resolvedAt ?? group.at(-1)!.createdAt).toISOString(),
      annotations: group.map((x) => ({ id: x.id, status: x.status, severity: x.severity, createdAt: x.createdAt.toISOString(), resolvedAt: x.resolvedAt?.toISOString() ?? null, encounterId: x.encounterId })),
    })) };
  }

  async summary(principal: AuthenticatedPrincipal, patientId: string, query: ProgressQuery): Promise<ProgressSummaryResponse> {
    const { period, currentPlan } = await this.context(principal, patientId, query);
    const [encounters, assessments, trends, goals, annotations] = await Promise.all([
      this.prisma.encounter.count({ where: { organizationId: principal.organizationId, patientId, status: 'COMPLETED', endedAt: { gte: new Date(period.from), lte: new Date(period.to) } } }),
      this.prisma.assessment.count({ where: { organizationId: principal.organizationId, patientId, status: 'COMPLETED', voidedAt: null, performedAt: { gte: new Date(period.from), lte: new Date(period.to) } } }),
      this.measurements(principal, patientId, query), this.goals(principal, patientId, query), this.bodyAnnotations(principal, patientId, query),
    ]);
    const latest = newest([...[...trends.series].flatMap((s) => s.points.map((p) => new Date(p.performedAt))), ...annotations.groups.map((g) => new Date(g.lastObservedAt))]);
    return { period, counts: { completedEncounters: encounters, completedAssessments: assessments, comparableMeasurementSeries: trends.series.length, activeGoals: goals.goals.filter((g) => ['PLANNED', 'IN_PROGRESS'].includes(g.status)).length, activeBodyAnnotations: annotations.groups.reduce((sum, g) => sum + g.activeCount, 0) }, currentPlan: currentPlan?.currentRevision ? { id: currentPlan.id, title: currentPlan.currentRevision.title, status: currentPlan.status, revisionNumber: currentPlan.currentRevision.revisionNumber } : null, latestClinicalActivityAt: latest?.toISOString() ?? null };
  }

  async timeline(principal: AuthenticatedPrincipal, patientId: string, query: TimelineQuery): Promise<ClinicalTimelineResponse> {
    if (!(await this.prisma.patient.findFirst({ where: { id: patientId, organizationId: principal.organizationId }, select: { id: true } }))) {
      throw new NotFoundException({ code: 'PROGRESS_NOT_FOUND', message: 'Patient progress was not found.' });
    }
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 90 * 86_400_000);
    if (from > to || to.getTime() - from.getTime() > 10 * 365 * 86_400_000) {
      throw new BadRequestException({ code: 'CLINICAL_TIMELINE_INVALID_FILTER', message: 'Invalid timeline interval.' });
    }
    const base = { organizationId: principal.organizationId, patientId };
    const [encounters, assessments, measurements, plans, annotations] = await Promise.all([
      this.prisma.encounter.findMany({ where: { ...base, startedAt: { gte: from, lte: to }, ...(query.encounterId ? { id: query.encounterId } : {}) }, select: { id: true, startedAt: true, endedAt: true, status: true } }),
      this.prisma.assessment.findMany({ where: { ...base, performedAt: { gte: from, lte: to }, ...(query.encounterId ? { encounterId: query.encounterId } : {}) }, select: { id: true, title: true, status: true, performedAt: true, encounterId: true } }),
      this.prisma.measurement.findMany({ where: { ...base, performedAt: { gte: from, lte: to }, ...(query.encounterId ? { encounterId: query.encounterId } : {}), assessment: { status: 'COMPLETED', voidedAt: null } }, select: { id: true, definitionName: true, numericValue: true, unitCodeSnapshot: true, performedAt: true, assessmentId: true, encounterId: true } }),
      query.encounterId ? Promise.resolve([]) : this.prisma.rehabilitationPlan.findMany({ where: base, select: { id: true, status: true, createdAt: true, currentRevision: { select: { title: true } }, revisions: { where: { status: 'PUBLISHED', effectiveFrom: { gte: from, lte: to } }, select: { id: true, title: true, effectiveFrom: true, revisionNumber: true, goals: { select: { id: true, title: true, updatedAt: true, status: true } } } } } }),
      this.prisma.bodyAnnotation.findMany({ where: { ...base, createdAt: { gte: from, lte: to }, ...(query.encounterId ? { encounterId: query.encounterId } : {}), status: { not: 'VOIDED' } }, include: { structure: { select: { canonicalName: true } } } }),
    ]);
    const items: ClinicalTimelineItem[] = [];
    encounters.forEach((x) => items.push({ id: `encounter:${x.id}`, category: 'ENCOUNTER', occurredAt: x.startedAt.toISOString(), title: 'Клінічний контакт', description: x.status === 'COMPLETED' ? 'Завершений контакт' : 'Контакт у роботі', encounterId: x.id, source: { type: 'Encounter', id: x.id }, link: `/app/encounters/${x.id}` }));
    assessments.forEach((x) => items.push({ id: `assessment:${x.id}`, category: 'ASSESSMENT', occurredAt: x.performedAt.toISOString(), title: x.title, description: `Статус: ${x.status}`, encounterId: x.encounterId, source: { type: 'Assessment', id: x.id }, link: `/app/assessments/${x.id}` }));
    measurements.forEach((x) => items.push({ id: `measurement:${x.id}`, category: 'MEASUREMENT', occurredAt: x.performedAt.toISOString(), title: x.definitionName, description: x.numericValue === null ? null : `${x.numericValue} ${x.unitCodeSnapshot ?? ''}`.trim(), encounterId: x.encounterId, source: { type: 'Measurement', id: x.id }, link: `/app/assessments/${x.assessmentId}` }));
    plans.forEach((p) => { if (p.createdAt >= from && p.createdAt <= to) items.push({ id: `plan:${p.id}`, category: 'REHABILITATION_PLAN', occurredAt: p.createdAt.toISOString(), title: p.currentRevision?.title ?? 'План реабілітації', description: `Створено план; поточний статус: ${p.status}`, encounterId: null, source: { type: 'RehabilitationPlan', id: p.id }, link: `/app/rehabilitation-plans/${p.id}` }); p.revisions.forEach((r) => { if (!r.effectiveFrom) return; items.push({ id: `revision:${r.id}`, category: 'REHABILITATION_PLAN', occurredAt: r.effectiveFrom.toISOString(), title: r.title, description: `Опубліковано редакцію ${r.revisionNumber}`, encounterId: null, source: { type: 'RehabilitationPlanRevision', id: r.id }, link: `/app/rehabilitation-plans/${p.id}` }); r.goals.filter((g) => g.updatedAt >= from && g.updatedAt <= to).forEach((g) => items.push({ id: `goal:${g.id}`, category: 'GOAL', occurredAt: g.updatedAt.toISOString(), title: g.title, description: `Статус цілі: ${g.status}`, encounterId: null, source: { type: 'RehabilitationGoal', id: g.id }, link: `/app/rehabilitation-plans/${p.id}` })); }); });
    annotations.forEach((x) => items.push({ id: `annotation:${x.id}`, category: 'BODY_ANNOTATION', occurredAt: x.createdAt.toISOString(), title: `${x.type}: ${x.structure.canonicalName}`, description: x.severity === null ? x.title : `Інтенсивність: ${x.severity}/10`, encounterId: x.encounterId, source: { type: 'BodyAnnotation', id: x.id }, link: `/app/patients/${patientId}/body-map?structure=${encodeURIComponent(x.structureId)}` }));
    const lifecycleLabels: Record<string, string> = {
      REHABILITATION_PLAN_ACTIVATED: 'План активовано',
      REHABILITATION_PLAN_PAUSED: 'План призупинено',
      REHABILITATION_PLAN_RESUMED: 'План відновлено',
      REHABILITATION_PLAN_COMPLETED: 'План завершено',
      REHABILITATION_PLAN_CANCELLED: 'План скасовано',
    };
    const planIds = plans.map((plan) => plan.id);
    if (planIds.length) {
      const lifecycle = await this.prisma.auditEvent.findMany({
        where: { organizationId: principal.organizationId, entityType: 'RehabilitationPlan', entityId: { in: planIds }, action: { in: Object.keys(lifecycleLabels) }, occurredAt: { gte: from, lte: to } },
        select: { id: true, entityId: true, action: true, occurredAt: true },
      });
      lifecycle.forEach((event) => items.push({ id: `plan-lifecycle:${event.id}`, category: 'REHABILITATION_PLAN', occurredAt: event.occurredAt.toISOString(), title: lifecycleLabels[event.action] ?? 'Змінено стан плану', description: null, encounterId: null, source: { type: 'RehabilitationPlan', id: event.entityId }, link: `/app/rehabilitation-plans/${event.entityId}` }));
    }
    let sorted = items.filter((x) => !query.category || x.category === query.category).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
    if (query.cursor) { const cursor = Buffer.from(query.cursor, 'base64url').toString('utf8'); sorted = sorted.filter((x) => `${x.occurredAt}|${x.id}` < cursor); }
    const offset = query.cursor ? 0 : (query.page - 1) * query.pageSize;
    const page = sorted.slice(offset, offset + query.pageSize + 1);
    const more = page.length > query.pageSize;
    const visible = page.slice(0, query.pageSize);
    const last = visible.at(-1);
    return { items: visible, nextCursor: more && last ? Buffer.from(`${last.occurredAt}|${last.id}`).toString('base64url') : null, page: query.page, pageSize: query.pageSize };
  }
}
