import type { AnatomicalRegionCode, Laterality, UnitCode } from './assessments';
import type { SchedulingPersonRef } from './scheduling';

export const REHABILITATION_PLAN_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type RehabilitationPlanStatus = (typeof REHABILITATION_PLAN_STATUSES)[number];
export const REHABILITATION_GOAL_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'ACHIEVED',
  'NOT_ACHIEVED',
  'CANCELLED',
] as const;
export type RehabilitationGoalStatus = (typeof REHABILITATION_GOAL_STATUSES)[number];
export const GOAL_TARGET_OPERATORS = [
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN_OR_EQUAL',
  'EQUAL',
  'BETWEEN',
] as const;
export type GoalTargetOperator = (typeof GOAL_TARGET_OPERATORS)[number];
export const EXERCISE_CATEGORIES = [
  'MOBILITY',
  'STRENGTH',
  'STABILITY',
  'BALANCE',
  'ENDURANCE',
  'STRETCHING',
  'MOTOR_CONTROL',
  'FUNCTIONAL',
  'BREATHING',
  'OTHER',
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
export const EXERCISE_DOSAGE_KINDS = [
  'SETS_REPETITIONS',
  'TRIALS',
  'DURATION',
  'HOLD',
  'DISTANCE',
  'LOAD',
] as const;
export type ExerciseDosageKind = (typeof EXERCISE_DOSAGE_KINDS)[number];
export const EXERCISE_FREQUENCY_TYPES = [
  'DAILY',
  'WEEKLY',
  'ALTERNATE_DAYS',
  'SUPERVISED_ONLY',
] as const;
export type ExerciseFrequencyType = (typeof EXERCISE_FREQUENCY_TYPES)[number];

export type ExerciseMediaResponse = {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'ANIMATION' | 'DOCUMENT';
  caption: string | null;
  storageKey: string | null;
  externalUrl: string | null;
  source: string | null;
  sourceUrl: string | null;
  author: string | null;
  license: string | null;
  attribution: string | null;
  sortOrder: number;
};

export type ExerciseLibraryItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  difficulty: 'FOUNDATIONAL' | 'INTERMEDIATE' | 'ADVANCED' | null;
  anatomicalRegions: AnatomicalRegionCode[];
  targetMuscleGroups: string[];
  equipment: string[];
  supportedDosageKinds: ExerciseDosageKind[];
  active: boolean;
  mediaPreview: ExerciseMediaResponse | null;
};

export type ExerciseDetailResponse = ExerciseLibraryItem & {
  instructions: string;
  contraindicationNotes: string | null;
  safetyNotes: string | null;
  lateralityApplicability: Laterality[];
  media: ExerciseMediaResponse[];
};

export type ExerciseLibraryResponse = {
  items: ExerciseLibraryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type GoalProgressValue = {
  measurementId: string;
  value: number;
  unit: UnitCode | null;
  performedAt: string;
};

export type RehabilitationGoalResponse = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  anatomicalRegion: AnatomicalRegionCode | null;
  laterality: Laterality | null;
  status: RehabilitationGoalStatus;
  targetDate: string | null;
  measurementDefinition: { id: string; code: string; name: string } | null;
  targetOperator: GoalTargetOperator | null;
  targetValue: number | null;
  targetValueUpper: number | null;
  targetUnit: UnitCode | null;
  baseline: GoalProgressValue | null;
  current: GoalProgressValue | null;
  targetAppearsReached: boolean | null;
  displayOrder: number;
};

export type RehabilitationPlanPhaseResponse = {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  expectedStart: string | null;
  expectedEnd: string | null;
  criteria: string | null;
};

export type ExercisePrescriptionResponse = {
  id: string;
  phaseId: string | null;
  exercise: ExerciseLibraryItem;
  laterality: Laterality | null;
  anatomicalRegion: AnatomicalRegionCode | null;
  sets: number | null;
  repetitions: number | null;
  trials: number | null;
  durationSeconds: number | null;
  holdSeconds: number | null;
  distanceMeters: number | null;
  loadKg: number | null;
  frequencyType: ExerciseFrequencyType | null;
  sessionsPerDay: number | null;
  daysPerWeek: number | null;
  instructionsOverride: string | null;
  specialistNote: string | null;
  precautions: string | null;
  progressionCriteria: string | null;
  regressionCriteria: string | null;
  displayOrder: number;
};

export type RehabilitationPlanRevisionResponse = {
  id: string;
  revisionNumber: number;
  status: 'DRAFT' | 'PUBLISHED';
  title: string;
  description: string | null;
  startDate: string;
  expectedEndDate: string | null;
  effectiveFrom: string | null;
  changeSummary: string | null;
  goals: RehabilitationGoalResponse[];
  phases: RehabilitationPlanPhaseResponse[];
  exercisePrescriptions: ExercisePrescriptionResponse[];
  createdBy: SchedulingPersonRef;
  createdAt: string;
};

export type RehabilitationPlanResponse = {
  id: string;
  patient: SchedulingPersonRef;
  responsiblePractitioner: SchedulingPersonRef;
  status: RehabilitationPlanStatus;
  currentRevision: RehabilitationPlanRevisionResponse | null;
  draftRevision: RehabilitationPlanRevisionResponse | null;
  revisionHistory: Array<{
    id: string;
    revisionNumber: number;
    effectiveFrom: string | null;
    changeSummary: string | null;
    createdBy: SchedulingPersonRef;
    createdAt: string;
  }>;
  cancellationReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type RehabilitationPlanListItem = {
  id: string;
  status: RehabilitationPlanStatus;
  title: string;
  startDate: string;
  expectedEndDate: string | null;
  responsiblePractitioner: SchedulingPersonRef;
  currentRevisionNumber: number | null;
  hasDraftRevision: boolean;
  goalCount: number;
  prescriptionCount: number;
  version: number;
  updatedAt: string;
};
