import { z } from 'zod';

export const createEncounterExerciseLogBodySchema = z.object({
  exerciseId: z.string().uuid().nullable().optional(),
  exerciseName: z.string().trim().max(200).nullable().optional(),
  sets: z.number().int().min(0).max(1000).nullable().optional(),
  repetitions: z.number().int().min(0).max(10000).nullable().optional(),
  weightKg: z.number().min(0).max(10000).nullable().optional(),
  durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  specialistNote: z.string().trim().max(2000).nullable().optional(),
}).strict().refine((value) => Boolean(value.exerciseId || value.exerciseName), { message: 'Вкажіть вправу або назву вправи.' });

export type CreateEncounterExerciseLogBody = z.infer<typeof createEncounterExerciseLogBodySchema>;
