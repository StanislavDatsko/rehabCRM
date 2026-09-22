import 'server-only';

import type {
  AnatomicalRegionCode,
  ExerciseCategory,
  ExerciseDetailResponse,
  ExerciseFrequencyType,
  ExerciseLibraryResponse,
  GoalTargetOperator,
  Laterality,
  RehabilitationGoalStatus,
  RehabilitationPlanListItem,
  RehabilitationPlanResponse,
  UnitCode,
} from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export type GoalInput = {
  id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  anatomicalRegion?: AnatomicalRegionCode | null;
  laterality?: Laterality | null;
  status: RehabilitationGoalStatus;
  targetDate?: string | null;
  measurementDefinitionId?: string | null;
  baselineMeasurementId?: string | null;
  targetOperator?: GoalTargetOperator | null;
  targetValue?: number | null;
  targetValueUpper?: number | null;
  targetUnit?: UnitCode | null;
  displayOrder: number;
};

export type PhaseInput = {
  id?: string;
  key: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  expectedStart?: string | null;
  expectedEnd?: string | null;
  criteria?: string | null;
};

export type PrescriptionInput = {
  id?: string;
  phaseKey?: string | null;
  exerciseDefinitionId: string;
  laterality?: Laterality | null;
  anatomicalRegion?: AnatomicalRegionCode | null;
  sets?: number | null;
  repetitions?: number | null;
  trials?: number | null;
  durationSeconds?: number | null;
  holdSeconds?: number | null;
  distanceMeters?: number | null;
  loadKg?: number | null;
  frequencyType?: ExerciseFrequencyType | null;
  sessionsPerDay?: number | null;
  daysPerWeek?: number | null;
  instructionsOverride?: string | null;
  specialistNote?: string | null;
  precautions?: string | null;
  progressionCriteria?: string | null;
  regressionCriteria?: string | null;
  displayOrder: number;
};

export async function listExercises(
  filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: ExerciseCategory;
    anatomicalRegion?: AnatomicalRegionCode;
    equipment?: string;
  } = {},
): Promise<ExerciseLibraryResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(
    ([key, value]) => value !== undefined && value !== '' && params.set(key, String(value)),
  );
  return serverApiFetch(`/api/v1/exercises${params.size ? `?${params}` : ''}`);
}

export async function getExercise(id: string): Promise<ExerciseDetailResponse> {
  return serverApiFetch(`/api/v1/exercises/${id}`);
}

export async function listPatientPlans(patientId: string): Promise<RehabilitationPlanListItem[]> {
  return serverApiFetch(`/api/v1/patients/${patientId}/rehabilitation-plans`);
}

export async function getPlan(id: string): Promise<RehabilitationPlanResponse> {
  return serverApiFetch(`/api/v1/rehabilitation-plans/${id}`);
}

export async function createPlan(
  patientId: string,
  body: {
    title: string;
    description?: string | null;
    startDate: string;
    expectedEndDate?: string | null;
  },
): Promise<RehabilitationPlanResponse> {
  return serverApiFetch(
    `/api/v1/patients/${patientId}/rehabilitation-plans`,
    jsonInit('POST', body),
  );
}

export async function updatePlan(
  id: string,
  body: {
    version: number;
    revisionId: string;
    title: string;
    description?: string | null;
    startDate: string;
    expectedEndDate?: string | null;
    changeSummary?: string | null;
    goals: GoalInput[];
    phases: PhaseInput[];
    exercisePrescriptions: PrescriptionInput[];
  },
): Promise<RehabilitationPlanResponse> {
  return serverApiFetch(`/api/v1/rehabilitation-plans/${id}`, jsonInit('PATCH', body));
}

export async function planCommand(
  id: string,
  command: 'activate' | 'pause' | 'resume' | 'complete',
  version: number,
): Promise<RehabilitationPlanResponse> {
  return serverApiFetch(
    `/api/v1/rehabilitation-plans/${id}/${command}`,
    jsonInit('POST', { version }),
  );
}

export async function cancelPlan(
  id: string,
  version: number,
  reason: string,
): Promise<RehabilitationPlanResponse> {
  return serverApiFetch(
    `/api/v1/rehabilitation-plans/${id}/cancel`,
    jsonInit('POST', { version, reason }),
  );
}

export async function createPlanRevision(
  id: string,
  version: number,
): Promise<RehabilitationPlanResponse> {
  return serverApiFetch(
    `/api/v1/rehabilitation-plans/${id}/revisions`,
    jsonInit('POST', { version }),
  );
}

export async function publishPlanRevision(
  id: string,
  revisionId: string,
  version: number,
): Promise<RehabilitationPlanResponse> {
  return serverApiFetch(
    `/api/v1/rehabilitation-plans/${id}/revisions/${revisionId}/publish`,
    jsonInit('POST', { version }),
  );
}
