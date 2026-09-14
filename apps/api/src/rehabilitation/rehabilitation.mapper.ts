import type {
  ExerciseDetailResponse,
  ExerciseLibraryItem,
  GoalProgressValue,
  RehabilitationPlanListItem,
  RehabilitationPlanResponse,
  RehabilitationPlanRevisionResponse,
} from '@repo/contracts';
import type { Prisma } from '@prisma/client';

export const EXERCISE_INCLUDE = {
  media: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
} satisfies Prisma.ExerciseDefinitionInclude;
export const REVISION_INCLUDE = {
  goals: {
    include: { measurementDefinition: true },
    orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }],
  },
  phases: { orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }] },
  prescriptions: {
    include: { exerciseDefinition: { include: EXERCISE_INCLUDE } },
    orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }],
  },
  createdBy: { select: { id: true, displayName: true } },
} satisfies Prisma.RehabilitationPlanRevisionInclude;
export const PLAN_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, middleName: true } },
  responsiblePractitioner: { include: { user: { select: { displayName: true } } } },
  revisions: { include: REVISION_INCLUDE, orderBy: [{ revisionNumber: 'asc' as const }] },
} satisfies Prisma.RehabilitationPlanInclude;

export type ExerciseWithMedia = Prisma.ExerciseDefinitionGetPayload<{
  include: typeof EXERCISE_INCLUDE;
}>;
export type RevisionWithContent = Prisma.RehabilitationPlanRevisionGetPayload<{
  include: typeof REVISION_INCLUDE;
}>;
export type PlanWithContent = Prisma.RehabilitationPlanGetPayload<{ include: typeof PLAN_INCLUDE }>;

const media = (row: ExerciseWithMedia['media'][number]) => ({
  id: row.id,
  mediaType: row.mediaType,
  caption: row.caption,
  storageKey: row.storageKey,
  externalUrl: row.externalUrl,
  source: row.source,
  sourceUrl: row.sourceUrl,
  author: row.author,
  license: row.license,
  attribution: row.attribution,
  sortOrder: row.sortOrder,
});

export function toExerciseItem(row: ExerciseWithMedia): ExerciseLibraryItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    anatomicalRegions: row.anatomicalRegionCodes as ExerciseLibraryItem['anatomicalRegions'],
    targetMuscleGroups: row.targetMuscleGroupCodes,
    equipment: row.equipment,
    supportedDosageKinds: row.supportedDosageKinds,
    active: row.active,
    mediaPreview: row.media[0] ? media(row.media[0]) : null,
  };
}

export function toExerciseDetail(row: ExerciseWithMedia): ExerciseDetailResponse {
  return {
    ...toExerciseItem(row),
    instructions: row.instructions,
    contraindicationNotes: row.contraindicationNotes,
    safetyNotes: row.safetyNotes,
    lateralityApplicability: row.lateralityApplicability,
    media: row.media.map(media),
  };
}

function patientName(patient: PlanWithContent['patient']): string {
  return [patient.lastName, patient.firstName, patient.middleName].filter(Boolean).join(' ');
}

export function toRevisionResponse(
  revision: RevisionWithContent,
  progress: ReadonlyMap<string, GoalProgressValue | null>,
): RehabilitationPlanRevisionResponse {
  return {
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    status: revision.status,
    title: revision.title,
    description: revision.description,
    startDate: revision.startDate.toISOString().slice(0, 10),
    expectedEndDate: revision.expectedEndDate?.toISOString().slice(0, 10) ?? null,
    effectiveFrom: revision.effectiveFrom?.toISOString() ?? null,
    changeSummary: revision.changeSummary,
    goals: revision.goals.map((goal) => {
      const current = progress.get(goal.id) ?? null;
      let targetAppearsReached: boolean | null = null;
      if (current && goal.targetOperator && goal.targetValue !== null) {
        targetAppearsReached =
          goal.targetOperator === 'GREATER_THAN_OR_EQUAL'
            ? current.value >= goal.targetValue
            : goal.targetOperator === 'LESS_THAN_OR_EQUAL'
              ? current.value <= goal.targetValue
              : goal.targetOperator === 'EQUAL'
                ? current.value === goal.targetValue
                : goal.targetValueUpper !== null &&
                  current.value >= goal.targetValue &&
                  current.value <= goal.targetValueUpper;
      }
      return {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        anatomicalRegion:
          goal.anatomicalRegionCode as RehabilitationPlanRevisionResponse['goals'][number]['anatomicalRegion'],
        laterality: goal.laterality,
        status: goal.status,
        targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null,
        measurementDefinition: goal.measurementDefinition
          ? {
              id: goal.measurementDefinition.id,
              code: goal.measurementDefinition.code,
              name: goal.measurementDefinition.name,
            }
          : null,
        targetOperator: goal.targetOperator,
        targetValue: goal.targetValue,
        targetValueUpper: goal.targetValueUpper,
        targetUnit:
          goal.targetUnitCode as RehabilitationPlanRevisionResponse['goals'][number]['targetUnit'],
        baseline:
          goal.baselineMeasurementId &&
          goal.baselineNumericValueSnapshot !== null &&
          goal.baselinePerformedAt
            ? {
                measurementId: goal.baselineMeasurementId,
                value: goal.baselineNumericValueSnapshot,
                unit: goal.baselineUnitCodeSnapshot as GoalProgressValue['unit'],
                performedAt: goal.baselinePerformedAt.toISOString(),
              }
            : null,
        current,
        targetAppearsReached,
        displayOrder: goal.displayOrder,
      };
    }),
    phases: revision.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      description: phase.description,
      displayOrder: phase.displayOrder,
      expectedStart: phase.expectedStart?.toISOString().slice(0, 10) ?? null,
      expectedEnd: phase.expectedEnd?.toISOString().slice(0, 10) ?? null,
      criteria: phase.criteria,
    })),
    exercisePrescriptions: revision.prescriptions.map((prescription) => ({
      id: prescription.id,
      phaseId: prescription.phaseId,
      exercise: {
        ...toExerciseItem(prescription.exerciseDefinition),
        code: prescription.exerciseCodeSnapshot,
        name: prescription.exerciseNameSnapshot,
      },
      laterality: prescription.laterality,
      anatomicalRegion:
        prescription.anatomicalRegionCode as RehabilitationPlanRevisionResponse['exercisePrescriptions'][number]['anatomicalRegion'],
      sets: prescription.sets,
      repetitions: prescription.repetitions,
      trials: prescription.trials,
      durationSeconds: prescription.durationSeconds,
      holdSeconds: prescription.holdSeconds,
      distanceMeters: prescription.distanceMeters,
      loadKg: prescription.loadKg,
      frequencyType: prescription.frequencyType,
      sessionsPerDay: prescription.sessionsPerDay,
      daysPerWeek: prescription.daysPerWeek,
      instructionsOverride: prescription.instructionsOverride,
      specialistNote: prescription.specialistNote,
      precautions: prescription.precautions,
      progressionCriteria: prescription.progressionCriteria,
      regressionCriteria: prescription.regressionCriteria,
      displayOrder: prescription.displayOrder,
    })),
    createdBy: { id: revision.createdBy.id, displayName: revision.createdBy.displayName },
    createdAt: revision.createdAt.toISOString(),
  };
}

export function toPlanResponse(
  plan: PlanWithContent,
  progress: ReadonlyMap<string, GoalProgressValue | null>,
): RehabilitationPlanResponse {
  const current = plan.revisions.find((revision) => revision.id === plan.currentRevisionId) ?? null;
  const draft = plan.revisions.find((revision) => revision.status === 'DRAFT') ?? null;
  return {
    id: plan.id,
    patient: { id: plan.patient.id, displayName: patientName(plan.patient) },
    responsiblePractitioner: {
      id: plan.responsiblePractitioner.id,
      displayName: plan.responsiblePractitioner.user.displayName,
    },
    status: plan.status,
    currentRevision: current ? toRevisionResponse(current, progress) : null,
    draftRevision: draft ? toRevisionResponse(draft, progress) : null,
    revisionHistory: plan.revisions
      .filter((r) => r.status === 'PUBLISHED')
      .map((r) => ({
        id: r.id,
        revisionNumber: r.revisionNumber,
        effectiveFrom: r.effectiveFrom?.toISOString() ?? null,
        changeSummary: r.changeSummary,
        createdBy: { id: r.createdBy.id, displayName: r.createdBy.displayName },
        createdAt: r.createdAt.toISOString(),
      })),
    cancellationReason: plan.cancellationReason,
    version: plan.version,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function toPlanListItem(plan: PlanWithContent): RehabilitationPlanListItem {
  const current = plan.revisions.find((revision) => revision.id === plan.currentRevisionId) ?? null;
  const draft = plan.revisions.find((revision) => revision.status === 'DRAFT') ?? null;
  const shown = current ?? draft;
  return {
    id: plan.id,
    status: plan.status,
    title: shown?.title ?? 'План реабілітації',
    startDate:
      shown?.startDate.toISOString().slice(0, 10) ?? plan.createdAt.toISOString().slice(0, 10),
    expectedEndDate: shown?.expectedEndDate?.toISOString().slice(0, 10) ?? null,
    responsiblePractitioner: {
      id: plan.responsiblePractitioner.id,
      displayName: plan.responsiblePractitioner.user.displayName,
    },
    currentRevisionNumber: current?.revisionNumber ?? null,
    hasDraftRevision: Boolean(draft),
    goalCount: shown?.goals.length ?? 0,
    prescriptionCount: shown?.prescriptions.length ?? 0,
    version: plan.version,
    updatedAt: plan.updatedAt.toISOString(),
  };
}
