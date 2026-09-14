import {
  ANATOMICAL_REGION_CODES,
  EXERCISE_CATEGORIES,
  EXERCISE_FREQUENCY_TYPES,
  GOAL_TARGET_OPERATORS,
  LATERALITIES,
  REHABILITATION_GOAL_STATUSES,
  UNIT_CODES,
} from '@repo/contracts';
import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).transform((v) => v || null);
const optionalPositiveInt = z.number().int().positive().nullable().optional();
const optionalPositive = z.number().positive().nullable().optional();

export const exerciseListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().min(1).max(50).optional(),
    search: z.string().trim().max(100).optional(),
    category: z.enum(EXERCISE_CATEGORIES).optional(),
    anatomicalRegion: z.enum(ANATOMICAL_REGION_CODES).optional(),
    equipment: z.string().trim().max(100).optional(),
    active: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  })
  .strict();

export const createPlanBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: nullableText(5000).optional(),
    startDate: date,
    expectedEndDate: z.union([date, z.null()]).optional(),
  })
  .strict()
  .refine((v) => !v.expectedEndDate || v.expectedEndDate >= v.startDate, {
    path: ['expectedEndDate'],
    message: 'Expected end must not precede start',
  });

const goalSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(200),
    description: nullableText(3000).optional(),
    category: nullableText(100).optional(),
    anatomicalRegion: z.enum(ANATOMICAL_REGION_CODES).nullable().optional(),
    laterality: z.enum(LATERALITIES).nullable().optional(),
    status: z.enum(REHABILITATION_GOAL_STATUSES).default('PLANNED'),
    targetDate: z.union([date, z.null()]).optional(),
    measurementDefinitionId: z.union([z.string().uuid(), z.null()]).optional(),
    baselineMeasurementId: z.union([z.string().uuid(), z.null()]).optional(),
    targetOperator: z.enum(GOAL_TARGET_OPERATORS).nullable().optional(),
    targetValue: z.number().finite().nullable().optional(),
    targetValueUpper: z.number().finite().nullable().optional(),
    targetUnit: z.enum(UNIT_CODES).nullable().optional(),
    displayOrder: z.number().int().min(0),
  })
  .strict();

const phaseSchema = z
  .object({
    id: z.string().uuid().optional(),
    key: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(200),
    description: nullableText(3000).optional(),
    displayOrder: z.number().int().min(0),
    expectedStart: z.union([date, z.null()]).optional(),
    expectedEnd: z.union([date, z.null()]).optional(),
    criteria: nullableText(3000).optional(),
  })
  .strict()
  .refine((v) => !v.expectedStart || !v.expectedEnd || v.expectedEnd >= v.expectedStart, {
    path: ['expectedEnd'],
    message: 'Phase end must not precede start',
  });

const prescriptionSchema = z
  .object({
    id: z.string().uuid().optional(),
    phaseKey: z.string().trim().max(50).nullable().optional(),
    exerciseDefinitionId: z.string().uuid(),
    laterality: z.enum(LATERALITIES).nullable().optional(),
    anatomicalRegion: z.enum(ANATOMICAL_REGION_CODES).nullable().optional(),
    sets: optionalPositiveInt,
    repetitions: optionalPositiveInt,
    trials: optionalPositiveInt,
    durationSeconds: optionalPositiveInt,
    holdSeconds: optionalPositiveInt,
    distanceMeters: optionalPositive,
    loadKg: z.number().min(0).nullable().optional(),
    frequencyType: z.enum(EXERCISE_FREQUENCY_TYPES).nullable().optional(),
    sessionsPerDay: z.number().int().min(1).max(20).nullable().optional(),
    daysPerWeek: z.number().int().min(1).max(7).nullable().optional(),
    instructionsOverride: nullableText(5000).optional(),
    specialistNote: nullableText(3000).optional(),
    precautions: nullableText(3000).optional(),
    progressionCriteria: nullableText(3000).optional(),
    regressionCriteria: nullableText(3000).optional(),
    displayOrder: z.number().int().min(0),
  })
  .strict()
  .refine(
    (v) =>
      [
        v.sets,
        v.repetitions,
        v.trials,
        v.durationSeconds,
        v.holdSeconds,
        v.distanceMeters,
        v.loadKg,
      ].some((x) => x !== null && x !== undefined),
    { message: 'At least one dosage value is required' },
  );

export const updatePlanBodySchema = z
  .object({
    version: z.number().int().positive(),
    revisionId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: nullableText(5000).optional(),
    startDate: date,
    expectedEndDate: z.union([date, z.null()]).optional(),
    changeSummary: nullableText(1000).optional(),
    goals: z.array(goalSchema).max(50),
    phases: z.array(phaseSchema).max(20),
    exercisePrescriptions: z.array(prescriptionSchema).max(100),
  })
  .strict()
  .refine((v) => !v.expectedEndDate || v.expectedEndDate >= v.startDate, {
    path: ['expectedEndDate'],
    message: 'Expected end must not precede start',
  });

export const planVersionCommandSchema = z.object({ version: z.number().int().positive() }).strict();
export const revisionCommandSchema = z
  .object({ version: z.number().int().positive(), revisionId: z.string().uuid() })
  .strict();
export const cancelPlanBodySchema = z
  .object({ version: z.number().int().positive(), reason: z.string().trim().min(3).max(1000) })
  .strict();

export type ExerciseListQuery = z.infer<typeof exerciseListQuerySchema>;
export type CreatePlanBody = z.infer<typeof createPlanBodySchema>;
export type UpdatePlanBody = z.infer<typeof updatePlanBodySchema>;
export type PlanVersionCommand = z.infer<typeof planVersionCommandSchema>;
export type RevisionCommand = z.infer<typeof revisionCommandSchema>;
export type CancelPlanBody = z.infer<typeof cancelPlanBodySchema>;
