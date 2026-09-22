'use server';

import {
  ANATOMICAL_REGION_CODES,
  EXERCISE_FREQUENCY_TYPES,
  GOAL_TARGET_OPERATORS,
  LATERALITIES,
  REHABILITATION_GOAL_STATUSES,
  UNIT_CODES,
  type AnatomicalRegionCode,
  type ExerciseFrequencyType,
  type GoalTargetOperator,
  type Laterality,
  type RehabilitationGoalStatus,
  type UnitCode,
} from '@repo/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ServerApiError } from '../../../lib/api/server-api-client';
import { loadCurrentUser } from '../../../lib/app/load-current-user';
import {
  cancelPlan,
  createPlan,
  createPlanRevision,
  planCommand,
  publishPlanRevision,
  updatePlan,
  type GoalInput,
  type PhaseInput,
  type PrescriptionInput,
} from '../api/rehabilitation-api';
import { rehabilitationErrorMessage } from '../labels';
import {
  canActivatePlan,
  canCancelPlan,
  canCompletePlan,
  canCreatePlan,
  canEditPlan,
  canPausePlan,
} from '../permissions';

export type RehabilitationFormState = { error: string | null };

const text = (value: FormDataEntryValue | null): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
const number = (value: FormDataEntryValue | null): number | null => {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : null;
};
const integer = (value: FormDataEntryValue | null): number | null => {
  const parsed = number(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
};
const enumValue = <T extends string>(value: string | null, allowed: readonly T[]): T | null =>
  value && allowed.includes(value as T) ? (value as T) : null;

function errorState(error: unknown): RehabilitationFormState {
  return {
    error: rehabilitationErrorMessage(
      error instanceof ServerApiError ? error.body?.code : undefined,
    ),
  };
}

async function userOrRedirect() {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') redirect('/login?reason=expired');
  return me;
}

export async function createPlanAction(
  _state: RehabilitationFormState,
  form: FormData,
): Promise<RehabilitationFormState> {
  const me = await userOrRedirect();
  if (me === 'denied' || !canCreatePlan(me) || !canActivatePlan(me))
    return { error: rehabilitationErrorMessage('FORBIDDEN') };
  const patientId = text(form.get('patientId'));
  const title = text(form.get('title'));
  const startDate = text(form.get('startDate'));
  if (!patientId || !title || !startDate)
    return { error: rehabilitationErrorMessage('VALIDATION_FAILED') };
  let created: { id: string; version: number };
  try {
    created = await createPlan(patientId, {
        title,
        description: text(form.get('description')),
        startDate,
        expectedEndDate: text(form.get('expectedEndDate')),
      });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/app/patients/${patientId}`);
  const baseline = text(form.get('baselineMeasurementId'));
  redirect(
    `/app/rehabilitation-plans/${created.id}?created=1${baseline ? `&baseline=${encodeURIComponent(baseline)}` : ''}`,
  );
}

function goalsFromForm(form: FormData): GoalInput[] {
  const goals: GoalInput[] = [];
  for (let index = 0; index < 30; index += 1) {
    const title = text(form.get(`goal.${index}.title`));
    if (!title) continue;
    const baseline = text(form.get(`goal.${index}.baseline`))?.split('|') ?? [];
    const targetOperator = enumValue(
      text(form.get(`goal.${index}.targetOperator`)),
      GOAL_TARGET_OPERATORS,
    );
    goals.push({
      id: text(form.get(`goal.${index}.id`)) ?? undefined,
      title,
      description: text(form.get(`goal.${index}.description`)),
      category: text(form.get(`goal.${index}.category`)),
      anatomicalRegion: enumValue(
        text(form.get(`goal.${index}.anatomicalRegion`)),
        ANATOMICAL_REGION_CODES,
      ) as AnatomicalRegionCode | null,
      laterality: enumValue(
        text(form.get(`goal.${index}.laterality`)),
        LATERALITIES,
      ) as Laterality | null,
      status: (enumValue(text(form.get(`goal.${index}.status`)), REHABILITATION_GOAL_STATUSES) ??
        'PLANNED') as RehabilitationGoalStatus,
      targetDate: text(form.get(`goal.${index}.targetDate`)),
      baselineMeasurementId: baseline[0] || null,
      measurementDefinitionId: baseline[1] || null,
      targetOperator: targetOperator as GoalTargetOperator | null,
      targetValue: number(form.get(`goal.${index}.targetValue`)),
      targetValueUpper: number(form.get(`goal.${index}.targetValueUpper`)),
      targetUnit: enumValue(
        text(form.get(`goal.${index}.targetUnit`)),
        UNIT_CODES,
      ) as UnitCode | null,
      displayOrder: goals.length,
    });
  }
  return goals;
}

function phasesFromForm(form: FormData): PhaseInput[] {
  const phases: PhaseInput[] = [];
  for (let index = 0; index < 20; index += 1) {
    const name = text(form.get(`phase.${index}.name`));
    if (!name) continue;
    phases.push({
      id: text(form.get(`phase.${index}.id`)) ?? undefined,
      key: text(form.get(`phase.${index}.key`)) ?? `phase-${index + 1}`,
      name,
      description: text(form.get(`phase.${index}.description`)),
      expectedStart: text(form.get(`phase.${index}.expectedStart`)),
      expectedEnd: text(form.get(`phase.${index}.expectedEnd`)),
      criteria: text(form.get(`phase.${index}.criteria`)),
      displayOrder: phases.length,
    });
  }
  return phases;
}

function prescriptionsFromForm(form: FormData): PrescriptionInput[] {
  const prescriptions: PrescriptionInput[] = [];
  for (let index = 0; index < 50; index += 1) {
    const exerciseDefinitionId = text(form.get(`prescription.${index}.exerciseDefinitionId`));
    if (!exerciseDefinitionId) continue;
    prescriptions.push({
      id: text(form.get(`prescription.${index}.id`)) ?? undefined,
      phaseKey: text(form.get(`prescription.${index}.phaseKey`)),
      exerciseDefinitionId,
      laterality: enumValue(
        text(form.get(`prescription.${index}.laterality`)),
        LATERALITIES,
      ) as Laterality | null,
      anatomicalRegion: enumValue(
        text(form.get(`prescription.${index}.anatomicalRegion`)),
        ANATOMICAL_REGION_CODES,
      ) as AnatomicalRegionCode | null,
      sets: integer(form.get(`prescription.${index}.sets`)),
      repetitions: integer(form.get(`prescription.${index}.repetitions`)),
      trials: integer(form.get(`prescription.${index}.trials`)),
      durationSeconds: integer(form.get(`prescription.${index}.durationSeconds`)),
      holdSeconds: integer(form.get(`prescription.${index}.holdSeconds`)),
      distanceMeters: number(form.get(`prescription.${index}.distanceMeters`)),
      loadKg: number(form.get(`prescription.${index}.loadKg`)),
      frequencyType: enumValue(
        text(form.get(`prescription.${index}.frequencyType`)),
        EXERCISE_FREQUENCY_TYPES,
      ) as ExerciseFrequencyType | null,
      sessionsPerDay: integer(form.get(`prescription.${index}.sessionsPerDay`)),
      daysPerWeek: integer(form.get(`prescription.${index}.daysPerWeek`)),
      instructionsOverride: text(form.get(`prescription.${index}.instructionsOverride`)),
      specialistNote: text(form.get(`prescription.${index}.specialistNote`)),
      precautions: text(form.get(`prescription.${index}.precautions`)),
      progressionCriteria: text(form.get(`prescription.${index}.progressionCriteria`)),
      regressionCriteria: text(form.get(`prescription.${index}.regressionCriteria`)),
      displayOrder: prescriptions.length,
    });
  }
  return prescriptions;
}

export async function savePlanAction(
  _state: RehabilitationFormState,
  form: FormData,
): Promise<RehabilitationFormState> {
  const me = await userOrRedirect();
  if (me === 'denied' || !canEditPlan(me))
    return { error: rehabilitationErrorMessage('FORBIDDEN') };
  const id = text(form.get('planId'));
  const revisionId = text(form.get('revisionId'));
  const title = text(form.get('title'));
  const startDate = text(form.get('startDate'));
  const version = integer(form.get('version'));
  if (!id || !revisionId || !title || !startDate || !version)
    return { error: rehabilitationErrorMessage('VALIDATION_FAILED') };
  try {
    await updatePlan(id, {
      version,
      revisionId,
      title,
      startDate,
      description: text(form.get('description')),
      expectedEndDate: text(form.get('expectedEndDate')),
      changeSummary: text(form.get('changeSummary')),
      goals: goalsFromForm(form),
      phases: phasesFromForm(form),
      exercisePrescriptions: prescriptionsFromForm(form),
    });
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/app/rehabilitation-plans/${id}`);
  redirect(`/app/rehabilitation-plans/${id}?saved=1`);
}

export async function planLifecycleAction(
  _state: RehabilitationFormState,
  form: FormData,
): Promise<RehabilitationFormState> {
  const me = await userOrRedirect();
  const id = text(form.get('planId'));
  const command = text(form.get('command'));
  const version = integer(form.get('version'));
  if (!id || !version || !command)
    return { error: rehabilitationErrorMessage('VALIDATION_FAILED') };
  const permitted =
    me !== 'denied' &&
    ((command === 'activate' && canActivatePlan(me)) ||
      ((command === 'pause' || command === 'resume') && canPausePlan(me)) ||
      (command === 'complete' && canCompletePlan(me)) ||
      (command === 'cancel' && canCancelPlan(me)) ||
      ((command === 'create-revision' || command === 'publish') && canEditPlan(me)));
  if (!permitted) return { error: rehabilitationErrorMessage('FORBIDDEN') };
  try {
    if (command === 'cancel')
      await cancelPlan(
        id,
        version,
        text(form.get('reason')) ?? 'Скасовано відповідальним фахівцем',
      );
    else if (command === 'create-revision') await createPlanRevision(id, version);
    else if (command === 'publish') {
      const revisionId = text(form.get('revisionId'));
      if (!revisionId) return { error: rehabilitationErrorMessage('VALIDATION_FAILED') };
      await publishPlanRevision(id, revisionId, version);
    } else if (['activate', 'pause', 'resume', 'complete'].includes(command)) {
      await planCommand(id, command as 'activate' | 'pause' | 'resume' | 'complete', version);
    } else return { error: rehabilitationErrorMessage('VALIDATION_FAILED') };
  } catch (error) {
    return errorState(error);
  }
  revalidatePath(`/app/rehabilitation-plans/${id}`);
  redirect(`/app/rehabilitation-plans/${id}?command=${command}`);
}
