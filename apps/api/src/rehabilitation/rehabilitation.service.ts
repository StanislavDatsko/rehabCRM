import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  defaultPagination,
  type ExerciseDetailResponse,
  type ExerciseLibraryResponse,
  type GoalProgressValue,
  type RehabilitationPlanListItem,
  type RehabilitationPlanResponse,
} from '@repo/contracts';
import type { Prisma, RehabilitationPlanStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedPrincipal } from '../common/auth/principal';
import { writeAuditEvent } from '../common/audit/write-audit';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  EXERCISE_INCLUDE,
  PLAN_INCLUDE,
  toExerciseDetail,
  toExerciseItem,
  toPlanListItem,
  toPlanResponse,
  type PlanWithContent,
} from './rehabilitation.mapper';
import type {
  CancelPlanBody,
  CreateExerciseBody,
  CreatePlanBody,
  ExerciseListQuery,
  PlanVersionCommand,
  RevisionCommand,
  UpdatePlanBody,
} from './rehabilitation.schemas';
import { canTransitionPlan } from './plan-transitions';

type Tx = Prisma.TransactionClient;
type Prepared = {
  goals: Prisma.RehabilitationGoalCreateManyInput[];
  phases: Prisma.RehabilitationPlanPhaseCreateManyInput[];
  prescriptions: Prisma.ExercisePrescriptionCreateManyInput[];
};

@Injectable()
export class RehabilitationService {
  constructor(private readonly prisma: PrismaService) {}

  async createExercise(principal: AuthenticatedPrincipal, body: CreateExerciseBody): Promise<ExerciseDetailResponse> {
    try {
      const row = await this.prisma.exerciseDefinition.create({ data: { id: randomUUID(), organizationId: principal.organizationId, code: body.code, name: body.name, description: body.description, instructions: body.instructions, category: body.category, difficulty: body.difficulty ?? null, anatomicalRegionCodes: body.anatomicalRegionCodes, lateralityApplicability: ['LEFT', 'RIGHT', 'MIDLINE', 'NOT_APPLICABLE'], targetMuscleGroupCodes: body.targetMuscleGroupCodes, equipment: body.equipment, supportedDosageKinds: [], active: true }, include: EXERCISE_INCLUDE });
      return toExerciseDetail(row);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException({ code: 'EXERCISE_CODE_CONFLICT', message: 'Exercise code already exists in this organization.' });
      throw error;
    }
  }

  async listExercises(
    principal: AuthenticatedPrincipal,
    query: ExerciseListQuery,
  ): Promise<ExerciseLibraryResponse> {
    const { page, pageSize } = defaultPagination(query.page, query.pageSize ?? 20);
    const where: Prisma.ExerciseDefinitionWhereInput = {
      OR: [{ organizationId: null }, { organizationId: principal.organizationId }],
      active: query.active ?? true,
      category: query.category,
      anatomicalRegionCodes: query.anatomicalRegion ? { has: query.anatomicalRegion } : undefined,
      equipment: query.equipment ? { has: query.equipment } : undefined,
      ...(query.search
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: query.search, mode: 'insensitive' } },
                  { code: { contains: query.search, mode: 'insensitive' } },
                  { description: { contains: query.search, mode: 'insensitive' } },
                ],
              },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.exerciseDefinition.count({ where }),
      this.prisma.exerciseDefinition.findMany({
        where,
        include: EXERCISE_INCLUDE,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map(toExerciseItem),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async getExercise(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<ExerciseDetailResponse> {
    const row = await this.prisma.exerciseDefinition.findFirst({
      where: { id, OR: [{ organizationId: null }, { organizationId: principal.organizationId }] },
      include: EXERCISE_INCLUDE,
    });
    if (!row)
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: 'Exercise was not found.',
      });
    return toExerciseDetail(row);
  }

  async listPlans(
    principal: AuthenticatedPrincipal,
    patientId: string,
  ): Promise<RehabilitationPlanListItem[]> {
    await this.requirePatient(principal.organizationId, patientId);
    const rows = await this.prisma.rehabilitationPlan.findMany({
      where: { organizationId: principal.organizationId, patientId },
      include: PLAN_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map(toPlanListItem);
  }

  async getPlan(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<RehabilitationPlanResponse> {
    const plan = await this.requirePlan(principal.organizationId, id);
    return toPlanResponse(plan, await this.progressForPlan(plan));
  }

  async createPlan(
    principal: AuthenticatedPrincipal,
    patientId: string,
    body: CreatePlanBody,
    requestId: string,
  ): Promise<RehabilitationPlanResponse> {
    await this.requirePatient(principal.organizationId, patientId);
    const practitioner = await this.requireCurrentPractitioner(principal);
    const planId = randomUUID();
    const revisionId = randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await tx.rehabilitationPlan.create({
        data: {
          id: planId,
          organizationId: principal.organizationId,
          patientId,
          responsiblePractitionerId: practitioner.id,
          createdByUserId: principal.userId,
          updatedByUserId: principal.userId,
        },
      });
      await tx.rehabilitationPlanRevision.create({
        data: {
          id: revisionId,
          organizationId: principal.organizationId,
          planId,
          revisionNumber: 1,
          title: body.title,
          description: body.description ?? null,
          startDate: this.date(body.startDate),
          expectedEndDate: body.expectedEndDate ? this.date(body.expectedEndDate) : null,
          createdByUserId: principal.userId,
        },
      });
      await this.audit(tx, principal, planId, requestId, 'REHABILITATION_PLAN_CREATED', {
        patientId,
        revisionId,
        revisionNumber: 1,
      });
    });
    return this.getPlan(principal, planId);
  }

  async updatePlan(
    principal: AuthenticatedPrincipal,
    id: string,
    body: UpdatePlanBody,
    requestId: string,
  ): Promise<RehabilitationPlanResponse> {
    const plan = await this.requirePlan(principal.organizationId, id);
    if (!['DRAFT', 'ACTIVE', 'PAUSED'].includes(plan.status)) {
      throw new ConflictException({
        code: 'REHABILITATION_PLAN_NOT_EDITABLE',
        message: 'A completed or cancelled plan cannot be edited.',
      });
    }
    const draft = plan.revisions.find((revision) => revision.status === 'DRAFT');
    if (!draft || draft.id !== body.revisionId) {
      throw new ConflictException({
        code: 'REHABILITATION_PLAN_NOT_EDITABLE',
        message: 'Create or select the editable draft revision first.',
      });
    }
    const prepared = await this.prepareContent(principal, plan, draft.id, body);
    const oldGoalIds = draft.goals.map((goal) => goal.id);
    const oldPrescriptionIds = draft.prescriptions.map((prescription) => prescription.id);
    const newGoalIds = prepared.goals
      .map((goal) => goal.id)
      .filter((goalId): goalId is string => Boolean(goalId));
    const newPrescriptionIds = prepared.prescriptions
      .map((prescription) => prescription.id)
      .filter((prescriptionId): prescriptionId is string => Boolean(prescriptionId));
    const addedGoalIds = newGoalIds.filter((goalId) => !oldGoalIds.includes(goalId));
    const removedGoalIds = oldGoalIds.filter((goalId) => !newGoalIds.includes(goalId));
    const addedPrescriptionIds = newPrescriptionIds.filter(
      (prescriptionId) => !oldPrescriptionIds.includes(prescriptionId),
    );
    const removedPrescriptionIds = oldPrescriptionIds.filter(
      (prescriptionId) => !newPrescriptionIds.includes(prescriptionId),
    );
    const oldGoalStatus = new Map(draft.goals.map((goal) => [goal.id, goal.status]));
    const statusChangedGoalIds = prepared.goals
      .filter(
        (goal) =>
          goal.id && oldGoalStatus.has(goal.id) && oldGoalStatus.get(goal.id) !== goal.status,
      )
      .map((goal) => goal.id as string);
    await this.prisma.$transaction(async (tx) => {
      await this.versionedPlanUpdate(tx, principal, id, body.version, {});
      await tx.exercisePrescription.deleteMany({
        where: { planRevisionId: draft.id, organizationId: principal.organizationId },
      });
      await tx.rehabilitationGoal.deleteMany({
        where: { planRevisionId: draft.id, organizationId: principal.organizationId },
      });
      await tx.rehabilitationPlanPhase.deleteMany({
        where: { planRevisionId: draft.id, organizationId: principal.organizationId },
      });
      await tx.rehabilitationPlanRevision.update({
        where: { id: draft.id },
        data: {
          title: body.title,
          description: body.description ?? null,
          startDate: this.date(body.startDate),
          expectedEndDate: body.expectedEndDate ? this.date(body.expectedEndDate) : null,
          changeSummary: body.changeSummary ?? null,
        },
      });
      if (prepared.phases.length)
        await tx.rehabilitationPlanPhase.createMany({ data: prepared.phases });
      if (prepared.goals.length) await tx.rehabilitationGoal.createMany({ data: prepared.goals });
      if (prepared.prescriptions.length)
        await tx.exercisePrescription.createMany({ data: prepared.prescriptions });
      await this.audit(tx, principal, id, requestId, 'REHABILITATION_PLAN_REVISION_UPDATED', {
        revisionId: draft.id,
        revisionNumber: draft.revisionNumber,
      });
      await this.audit(tx, principal, id, requestId, 'REHABILITATION_GOAL_UPDATED', {
        revisionId: draft.id,
        changedGoalIds: newGoalIds,
        removedGoalIds,
      });
      if (addedGoalIds.length)
        await this.audit(tx, principal, id, requestId, 'REHABILITATION_GOAL_CREATED', {
          revisionId: draft.id,
          goalIds: addedGoalIds,
        });
      if (statusChangedGoalIds.length)
        await this.audit(tx, principal, id, requestId, 'REHABILITATION_GOAL_STATUS_CHANGED', {
          revisionId: draft.id,
          goalIds: statusChangedGoalIds,
        });
      await this.audit(tx, principal, id, requestId, 'EXERCISE_PRESCRIPTION_UPDATED', {
        revisionId: draft.id,
        changedExercisePrescriptionIds: newPrescriptionIds,
      });
      if (addedPrescriptionIds.length)
        await this.audit(tx, principal, id, requestId, 'EXERCISE_PRESCRIPTION_ADDED', {
          revisionId: draft.id,
          exercisePrescriptionIds: addedPrescriptionIds,
        });
      if (removedPrescriptionIds.length)
        await this.audit(tx, principal, id, requestId, 'EXERCISE_PRESCRIPTION_REMOVED', {
          revisionId: draft.id,
          exercisePrescriptionIds: removedPrescriptionIds,
        });
    });
    return this.getPlan(principal, id);
  }

  async createRevision(
    principal: AuthenticatedPrincipal,
    id: string,
    body: PlanVersionCommand,
    requestId: string,
  ): Promise<RehabilitationPlanResponse> {
    const plan = await this.requirePlan(principal.organizationId, id);
    if (!['ACTIVE', 'PAUSED'].includes(plan.status) || !plan.currentRevisionId)
      this.invalidTransition('Only an active or paused plan can be revised.');
    if (plan.revisions.some((revision) => revision.status === 'DRAFT')) {
      throw new ConflictException({
        code: 'REHABILITATION_PLAN_DRAFT_EXISTS',
        message: 'An editable draft revision already exists.',
      });
    }
    const source = plan.revisions.find((revision) => revision.id === plan.currentRevisionId);
    if (!source)
      throw new ConflictException({
        code: 'REHABILITATION_PLAN_NOT_EDITABLE',
        message: 'Current revision is unavailable.',
      });
    const revisionId = randomUUID();
    const revisionNumber =
      Math.max(...plan.revisions.map((revision) => revision.revisionNumber)) + 1;
    await this.prisma.$transaction(async (tx) => {
      await this.versionedPlanUpdate(tx, principal, id, body.version, {});
      await tx.rehabilitationPlanRevision.create({
        data: {
          id: revisionId,
          organizationId: principal.organizationId,
          planId: id,
          basedOnRevisionId: source.id,
          revisionNumber,
          title: source.title,
          description: source.description,
          startDate: source.startDate,
          expectedEndDate: source.expectedEndDate,
          changeSummary: null,
          createdByUserId: principal.userId,
        },
      });
      const phaseMap = new Map(source.phases.map((phase) => [phase.id, randomUUID()]));
      if (source.phases.length)
        await tx.rehabilitationPlanPhase.createMany({
          data: source.phases.map((phase) => ({
            id: phaseMap.get(phase.id) as string,
            organizationId: principal.organizationId,
            planRevisionId: revisionId,
            name: phase.name,
            description: phase.description,
            displayOrder: phase.displayOrder,
            expectedStart: phase.expectedStart,
            expectedEnd: phase.expectedEnd,
            criteria: phase.criteria,
          })),
        });
      if (source.goals.length)
        await tx.rehabilitationGoal.createMany({
          data: source.goals.map((goal) => ({
            id: randomUUID(),
            organizationId: principal.organizationId,
            planRevisionId: revisionId,
            title: goal.title,
            description: goal.description,
            category: goal.category,
            anatomicalRegionCode: goal.anatomicalRegionCode,
            laterality: goal.laterality,
            status: goal.status,
            targetDate: goal.targetDate,
            measurementDefinitionId: goal.measurementDefinitionId,
            targetOperator: goal.targetOperator,
            targetValue: goal.targetValue,
            targetValueUpper: goal.targetValueUpper,
            targetUnitCode: goal.targetUnitCode,
            baselineMeasurementId: goal.baselineMeasurementId,
            baselineNumericValueSnapshot: goal.baselineNumericValueSnapshot,
            baselineUnitCodeSnapshot: goal.baselineUnitCodeSnapshot,
            baselineDefinitionCode: goal.baselineDefinitionCode,
            baselineDefinitionName: goal.baselineDefinitionName,
            baselinePerformedAt: goal.baselinePerformedAt,
            displayOrder: goal.displayOrder,
          })),
        });
      if (source.prescriptions.length)
        await tx.exercisePrescription.createMany({
          data: source.prescriptions.map((p) => ({
            id: randomUUID(),
            organizationId: principal.organizationId,
            planRevisionId: revisionId,
            phaseId: p.phaseId ? (phaseMap.get(p.phaseId) ?? null) : null,
            exerciseDefinitionId: p.exerciseDefinitionId,
            exerciseCodeSnapshot: p.exerciseCodeSnapshot,
            exerciseNameSnapshot: p.exerciseNameSnapshot,
            laterality: p.laterality,
            anatomicalRegionCode: p.anatomicalRegionCode,
            sets: p.sets,
            repetitions: p.repetitions,
            trials: p.trials,
            durationSeconds: p.durationSeconds,
            holdSeconds: p.holdSeconds,
            distanceMeters: p.distanceMeters,
            loadKg: p.loadKg,
            frequencyType: p.frequencyType,
            sessionsPerDay: p.sessionsPerDay,
            daysPerWeek: p.daysPerWeek,
            instructionsOverride: p.instructionsOverride,
            specialistNote: p.specialistNote,
            precautions: p.precautions,
            progressionCriteria: p.progressionCriteria,
            regressionCriteria: p.regressionCriteria,
            displayOrder: p.displayOrder,
          })),
        });
      await this.audit(tx, principal, id, requestId, 'REHABILITATION_PLAN_REVISION_CREATED', {
        revisionId,
        revisionNumber,
        basedOnRevisionId: source.id,
      });
    });
    const portalDelegate = (this.prisma as unknown as { patientPortalAccount?: { findFirst: (args: unknown) => Promise<{ userId: string } | null> } }).patientPortalAccount;
    const portal = portalDelegate ? await portalDelegate.findFirst({ where: { organizationId: principal.organizationId, patientId: plan.patientId, status: 'ACTIVE' }, select: { userId: true } }) : null;
    if (portal) {
      const notificationDelegate = (this.prisma as unknown as { notification?: { create: (args: unknown) => Promise<unknown> } }).notification;
      if (notificationDelegate) await notificationDelegate.create({ data: { id: randomUUID(), organizationId: principal.organizationId, recipientUserId: portal.userId, type: 'PLAN_UPDATED', category: 'PATIENT', title: 'Ваш план оновлено', message: 'Ваш план реабілітації оновлено клініцистом.', relatedPatientId: plan.patientId, relatedRehabilitationPlanId: id } }).catch((error: unknown) => { if ((error as { code?: string }).code !== 'P2002') throw error; });
    }
    return this.getPlan(principal, id);
  }

  async publishRevision(
    principal: AuthenticatedPrincipal,
    id: string,
    body: RevisionCommand,
    requestId: string,
  ): Promise<RehabilitationPlanResponse> {
    const plan = await this.requirePlan(principal.organizationId, id);
    if (!['ACTIVE', 'PAUSED'].includes(plan.status))
      this.invalidTransition('Only an active or paused plan can publish a revision.');
    const draft = plan.revisions.find(
      (revision) => revision.id === body.revisionId && revision.status === 'DRAFT',
    );
    if (!draft)
      throw new ConflictException({
        code: 'REHABILITATION_PLAN_NOT_EDITABLE',
        message: 'Draft revision was not found.',
      });
    this.assertCompleteEnough(draft);
    const effectiveFrom = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.versionedPlanUpdate(tx, principal, id, body.version, {
        currentRevisionId: draft.id,
      });
      await tx.rehabilitationPlanRevision.update({
        where: { id: draft.id },
        data: { status: 'PUBLISHED', effectiveFrom },
      });
      await this.audit(tx, principal, id, requestId, 'REHABILITATION_PLAN_REVISION_PUBLISHED', {
        revisionId: draft.id,
        revisionNumber: draft.revisionNumber,
      });
    });
    return this.getPlan(principal, id);
  }

  async activate(
    principal: AuthenticatedPrincipal,
    id: string,
    body: PlanVersionCommand,
    requestId: string,
  ): Promise<RehabilitationPlanResponse> {
    const plan = await this.requirePlan(principal.organizationId, id);
    if (plan.status !== 'DRAFT' || !canTransitionPlan(plan.status, 'ACTIVE'))
      this.invalidTransition('Only a draft plan can be activated.');
    const draft = plan.revisions.find((revision) => revision.status === 'DRAFT');
    if (!draft)
      throw new ConflictException({
        code: 'REHABILITATION_PLAN_NOT_EDITABLE',
        message: 'Draft revision was not found.',
      });
    this.assertCompleteEnough(draft);
    const effectiveFrom = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.versionedPlanUpdate(tx, principal, id, body.version, {
        status: 'ACTIVE',
        currentRevisionId: draft.id,
      });
      await tx.rehabilitationPlanRevision.update({
        where: { id: draft.id },
        data: { status: 'PUBLISHED', effectiveFrom },
      });
      await this.audit(tx, principal, id, requestId, 'REHABILITATION_PLAN_ACTIVATED', {
        statusChange: { from: 'DRAFT', to: 'ACTIVE' },
        revisionId: draft.id,
      });
    });
    return this.getPlan(principal, id);
  }

  async pause(
    principal: AuthenticatedPrincipal,
    id: string,
    body: PlanVersionCommand,
    requestId: string,
  ) {
    return this.transition(
      principal,
      id,
      body.version,
      'ACTIVE',
      'PAUSED',
      'REHABILITATION_PLAN_PAUSED',
      requestId,
    );
  }
  async resume(
    principal: AuthenticatedPrincipal,
    id: string,
    body: PlanVersionCommand,
    requestId: string,
  ) {
    return this.transition(
      principal,
      id,
      body.version,
      'PAUSED',
      'ACTIVE',
      'REHABILITATION_PLAN_RESUMED',
      requestId,
    );
  }

  async complete(
    principal: AuthenticatedPrincipal,
    id: string,
    body: PlanVersionCommand,
    requestId: string,
  ): Promise<RehabilitationPlanResponse> {
    const plan = await this.requirePlan(principal.organizationId, id);
    if (!canTransitionPlan(plan.status, 'COMPLETED'))
      this.invalidTransition('Only an active or paused plan can be completed.');
    if (plan.revisions.some((revision) => revision.status === 'DRAFT')) {
      throw new ConflictException({
        code: 'REHABILITATION_PLAN_DRAFT_EXISTS',
        message: 'Publish the draft revision before completing the plan.',
      });
    }
    return this.transition(
      principal,
      id,
      body.version,
      plan.status,
      'COMPLETED',
      'REHABILITATION_PLAN_COMPLETED',
      requestId,
      plan,
    );
  }

  async cancel(
    principal: AuthenticatedPrincipal,
    id: string,
    body: CancelPlanBody,
    requestId: string,
  ): Promise<RehabilitationPlanResponse> {
    const plan = await this.requirePlan(principal.organizationId, id);
    if (!canTransitionPlan(plan.status, 'CANCELLED'))
      this.invalidTransition('This plan cannot be cancelled.');
    await this.prisma.$transaction(async (tx) => {
      await this.versionedPlanUpdate(tx, principal, id, body.version, {
        status: 'CANCELLED',
        cancellationReason: body.reason,
        cancelledAt: new Date(),
        cancelledByUserId: principal.userId,
      });
      await this.audit(tx, principal, id, requestId, 'REHABILITATION_PLAN_CANCELLED', {
        statusChange: { from: plan.status, to: 'CANCELLED' },
        reasonRecorded: true,
      });
    });
    return this.getPlan(principal, id);
  }

  private async transition(
    principal: AuthenticatedPrincipal,
    id: string,
    version: number,
    from: RehabilitationPlanStatus,
    to: RehabilitationPlanStatus,
    action: string,
    requestId: string,
    loaded?: PlanWithContent,
  ): Promise<RehabilitationPlanResponse> {
    const plan = loaded ?? (await this.requirePlan(principal.organizationId, id));
    if (plan.status !== from || !canTransitionPlan(from, to))
      this.invalidTransition(`Plan must be ${from} for this transition.`);
    await this.prisma.$transaction(async (tx) => {
      await this.versionedPlanUpdate(tx, principal, id, version, { status: to });
      await this.audit(tx, principal, id, requestId, action, { statusChange: { from, to } });
    });
    return this.getPlan(principal, id);
  }

  private async prepareContent(
    principal: AuthenticatedPrincipal,
    plan: PlanWithContent,
    revisionId: string,
    body: UpdatePlanBody,
  ): Promise<Prepared> {
    const existingRevision = plan.revisions.find((revision) => revision.id === revisionId);
    if (!existingRevision || existingRevision.status !== 'DRAFT') {
      throw new ConflictException({
        code: 'REHABILITATION_PLAN_NOT_EDITABLE',
        message: 'Draft revision was not found.',
      });
    }
    const existingGoalIds = new Set(existingRevision.goals.map((goal) => goal.id));
    const existingPhaseIds = new Set(existingRevision.phases.map((phase) => phase.id));
    const existingPrescriptionIds = new Set(
      existingRevision.prescriptions.map((prescription) => prescription.id),
    );
    const preserveId = (candidate: string | undefined, allowed: ReadonlySet<string>): string => {
      if (!candidate) return randomUUID();
      if (!allowed.has(candidate)) {
        throw new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: 'A draft child identifier does not belong to this revision.',
        });
      }
      return candidate;
    };
    const definitionIds = [
      ...new Set(
        body.goals.map((g) => g.measurementDefinitionId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const definitions = await this.prisma.measurementDefinition.findMany({
      where: {
        id: { in: definitionIds },
        OR: [{ organizationId: null }, { organizationId: principal.organizationId }],
      },
    });
    if (definitions.length !== definitionIds.length)
      throw new NotFoundException({
        code: 'MEASUREMENT_DEFINITION_NOT_FOUND',
        message: 'Measurement definition was not found.',
      });
    const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
    const goals: Prisma.RehabilitationGoalCreateManyInput[] = [];
    for (const input of body.goals) {
      const definition = input.measurementDefinitionId
        ? definitionsById.get(input.measurementDefinitionId)
        : null;
      if (!definition) {
        if (
          input.targetOperator ||
          (input.targetValue !== null && input.targetValue !== undefined) ||
          input.baselineMeasurementId
        ) {
          throw new BadRequestException({
            code: 'REHABILITATION_GOAL_INVALID_TARGET',
            message: 'A described goal cannot contain a structured measurement target.',
          });
        }
        goals.push({
          id: preserveId(input.id, existingGoalIds),
          organizationId: principal.organizationId,
          planRevisionId: revisionId,
          title: input.title,
          description: input.description ?? null,
          category: input.category ?? null,
          anatomicalRegionCode: input.anatomicalRegion ?? null,
          laterality: input.laterality ?? null,
          status: input.status,
          targetDate: input.targetDate ? this.date(input.targetDate) : null,
          displayOrder: input.displayOrder,
        });
        continue;
      }
      if (
        !['NUMBER', 'INTEGER', 'SCALE'].includes(definition.valueType) ||
        !input.targetOperator ||
        input.targetValue === null ||
        input.targetValue === undefined
      ) {
        throw new BadRequestException({
          code: 'REHABILITATION_GOAL_INVALID_TARGET',
          message: 'Measurement-linked goals require a numeric definition, operator, and target.',
        });
      }
      if (
        input.targetOperator === 'BETWEEN' &&
        (input.targetValueUpper === null ||
          input.targetValueUpper === undefined ||
          input.targetValueUpper < input.targetValue)
      ) {
        throw new BadRequestException({
          code: 'REHABILITATION_GOAL_INVALID_TARGET',
          message: 'BETWEEN requires an ordered upper target.',
        });
      }
      if ((input.targetUnit ?? null) !== definition.unitCode)
        throw new BadRequestException({
          code: 'REHABILITATION_GOAL_INVALID_TARGET',
          message: 'Goal target unit must match the measurement definition.',
        });
      let baseline: Awaited<ReturnType<typeof this.findBaseline>> = null;
      if (input.baselineMeasurementId) {
        baseline = await this.findBaseline(principal.organizationId, input.baselineMeasurementId);
        if (!baseline)
          throw new NotFoundException({
            code: 'MEASUREMENT_DEFINITION_NOT_FOUND',
            message: 'Baseline measurement was not found.',
          });
        if (
          baseline.patientId !== plan.patientId ||
          baseline.definitionId !== definition.id ||
          baseline.anatomicalRegionCode !== (input.anatomicalRegion ?? null) ||
          baseline.laterality !== (input.laterality ?? null) ||
          baseline.assessment.status !== 'COMPLETED' ||
          baseline.numericValue === null
        ) {
          throw new BadRequestException({
            code: 'REHABILITATION_GOAL_MEASUREMENT_MISMATCH',
            message:
              'Baseline measurement does not match this patient, definition, region, or laterality.',
          });
        }
      }
      goals.push({
        id: preserveId(input.id, existingGoalIds),
        organizationId: principal.organizationId,
        planRevisionId: revisionId,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        anatomicalRegionCode: input.anatomicalRegion ?? null,
        laterality: input.laterality ?? null,
        status: input.status,
        targetDate: input.targetDate ? this.date(input.targetDate) : null,
        measurementDefinitionId: definition.id,
        targetOperator: input.targetOperator,
        targetValue: input.targetValue,
        targetValueUpper: input.targetValueUpper ?? null,
        targetUnitCode: definition.unitCode,
        baselineMeasurementId: baseline?.id ?? null,
        baselineNumericValueSnapshot: baseline?.numericValue ?? null,
        baselineUnitCodeSnapshot: baseline?.unitCodeSnapshot ?? null,
        baselineDefinitionCode: baseline?.definitionCode ?? null,
        baselineDefinitionName: baseline?.definitionName ?? null,
        baselinePerformedAt: baseline?.performedAt ?? null,
        displayOrder: input.displayOrder,
      });
    }

    const phaseKeys = new Set<string>();
    const phaseIds = new Map<string, string>();
    const phases = body.phases.map((phase) => {
      if (phaseKeys.has(phase.key))
        throw new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: 'Phase keys must be unique.',
        });
      phaseKeys.add(phase.key);
      const id = preserveId(phase.id, existingPhaseIds);
      phaseIds.set(phase.key, id);
      return {
        id,
        organizationId: principal.organizationId,
        planRevisionId: revisionId,
        name: phase.name,
        description: phase.description ?? null,
        displayOrder: phase.displayOrder,
        expectedStart: phase.expectedStart ? this.date(phase.expectedStart) : null,
        expectedEnd: phase.expectedEnd ? this.date(phase.expectedEnd) : null,
        criteria: phase.criteria ?? null,
      };
    });

    const exerciseIds = [...new Set(body.exercisePrescriptions.map((p) => p.exerciseDefinitionId))];
    const exercises = await this.prisma.exerciseDefinition.findMany({
      where: {
        id: { in: exerciseIds },
        OR: [{ organizationId: null }, { organizationId: principal.organizationId }],
      },
    });
    if (exercises.length !== exerciseIds.length)
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: 'Exercise was not found.',
      });
    const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    const prescriptions = body.exercisePrescriptions.map((input) => {
      const exercise = exercisesById.get(input.exerciseDefinitionId);
      if (!exercise)
        throw new NotFoundException({
          code: 'EXERCISE_NOT_FOUND',
          message: 'Exercise was not found.',
        });
      if (!exercise.active)
        throw new BadRequestException({
          code: 'EXERCISE_NOT_AVAILABLE',
          message: 'Inactive exercise cannot be added to a new revision.',
        });
      const phaseId = input.phaseKey ? phaseIds.get(input.phaseKey) : null;
      if (input.phaseKey && !phaseId)
        throw new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: 'Prescription phase was not found.',
        });
      if (input.laterality && !exercise.lateralityApplicability.includes(input.laterality))
        throw new BadRequestException({
          code: 'EXERCISE_PRESCRIPTION_INVALID_DOSAGE',
          message: 'Exercise does not support the selected laterality.',
        });
      return {
        id: preserveId(input.id, existingPrescriptionIds),
        organizationId: principal.organizationId,
        planRevisionId: revisionId,
        phaseId: phaseId ?? null,
        exerciseDefinitionId: exercise.id,
        exerciseCodeSnapshot: exercise.code,
        exerciseNameSnapshot: exercise.name,
        laterality: input.laterality ?? null,
        anatomicalRegionCode: input.anatomicalRegion ?? null,
        sets: input.sets ?? null,
        repetitions: input.repetitions ?? null,
        trials: input.trials ?? null,
        durationSeconds: input.durationSeconds ?? null,
        holdSeconds: input.holdSeconds ?? null,
        distanceMeters: input.distanceMeters ?? null,
        loadKg: input.loadKg ?? null,
        frequencyType: input.frequencyType ?? null,
        sessionsPerDay: input.sessionsPerDay ?? null,
        daysPerWeek: input.daysPerWeek ?? null,
        instructionsOverride: input.instructionsOverride ?? null,
        specialistNote: input.specialistNote ?? null,
        precautions: input.precautions ?? null,
        progressionCriteria: input.progressionCriteria ?? null,
        regressionCriteria: input.regressionCriteria ?? null,
        displayOrder: input.displayOrder,
      };
    });
    return { goals, phases, prescriptions };
  }

  private findBaseline(organizationId: string, id: string) {
    return this.prisma.measurement.findFirst({
      where: { id, organizationId },
      include: { assessment: { select: { status: true } } },
    });
  }

  private async progressForPlan(
    plan: PlanWithContent,
  ): Promise<Map<string, GoalProgressValue | null>> {
    const result = new Map<string, GoalProgressValue | null>();
    const goals = plan.revisions
      .flatMap((revision) => revision.goals)
      .filter((goal) => goal.measurementDefinitionId);
    await Promise.all(
      goals.map(async (goal) => {
        const measurement = await this.prisma.measurement.findFirst({
          where: {
            organizationId: plan.organizationId,
            patientId: plan.patientId,
            definitionId: goal.measurementDefinitionId as string,
            anatomicalRegionCode: goal.anatomicalRegionCode,
            laterality: goal.laterality,
            numericValue: { not: null },
            assessment: { status: 'COMPLETED' },
          },
          orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
        });
        result.set(
          goal.id,
          measurement && measurement.numericValue !== null
            ? {
                measurementId: measurement.id,
                value: measurement.numericValue,
                unit: measurement.unitCodeSnapshot as GoalProgressValue['unit'],
                performedAt: measurement.performedAt.toISOString(),
              }
            : null,
        );
      }),
    );
    return result;
  }

  private assertCompleteEnough(revision: PlanWithContent['revisions'][number]): void {
    if (revision.goals.length === 0 && revision.prescriptions.length === 0) {
      throw new BadRequestException({
        code: 'REHABILITATION_PLAN_INCOMPLETE',
        message: 'Add at least one goal or exercise prescription before activation/publication.',
      });
    }
  }

  private async versionedPlanUpdate(
    tx: Tx,
    principal: AuthenticatedPrincipal,
    id: string,
    version: number,
    data: Prisma.RehabilitationPlanUncheckedUpdateManyInput,
  ): Promise<void> {
    const result = await tx.rehabilitationPlan.updateMany({
      where: { id, organizationId: principal.organizationId, version },
      data: { ...data, updatedByUserId: principal.userId, version: { increment: 1 } },
    });
    if (result.count !== 1)
      throw new ConflictException({
        code: 'REHABILITATION_PLAN_UPDATE_CONFLICT',
        message: 'Plan was modified by another user. Refresh and retry.',
      });
  }

  private invalidTransition(message: string): never {
    throw new ConflictException({ code: 'REHABILITATION_PLAN_INVALID_TRANSITION', message });
  }
  private date(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private async requireCurrentPractitioner(principal: AuthenticatedPrincipal) {
    const row = await this.prisma.practitioner.findFirst({
      where: {
        organizationId: principal.organizationId,
        userId: principal.userId,
        status: 'ACTIVE',
      },
    });
    if (!row)
      throw new ForbiddenException({
        code: 'PRACTITIONER_REQUIRED',
        message: 'An active practitioner profile is required.',
      });
    return row;
  }
  private async requirePatient(organizationId: string, id: string): Promise<void> {
    const row = await this.prisma.patient.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!row)
      throw new NotFoundException({ code: 'PATIENT_NOT_FOUND', message: 'Patient was not found.' });
  }
  private async requirePlan(organizationId: string, id: string): Promise<PlanWithContent> {
    const row = await this.prisma.rehabilitationPlan.findFirst({
      where: { id, organizationId },
      include: PLAN_INCLUDE,
    });
    if (!row)
      throw new NotFoundException({
        code: 'REHABILITATION_PLAN_NOT_FOUND',
        message: 'Rehabilitation plan was not found.',
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
      entityType: 'RehabilitationPlan',
      entityId,
      requestId,
      metadata,
    });
  }
}
