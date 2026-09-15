import { z } from 'zod';

const score = z.number().int().min(0).max(10);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const dailyReportSchema = z.object({
  reportDate: date.optional(), overallWellbeing: score, fatigueLevel: score, painScore: score,
  comment: z.string().trim().max(2000).nullable().optional(),
}).strict();
export const dailyReportUpdateSchema = dailyReportSchema.extend({ version: z.number().int().positive() }).strict();
export const monitoringQuerySchema = z.object({ days: z.coerce.number().int().min(1).max(30).default(30) }).strict();
export const completionSchema = z.object({ exercisePrescriptionId: z.string().uuid(), executionDate: date.optional(), status: z.enum(['COMPLETED', 'PARTIAL', 'SKIPPED']), completedSets: z.number().int().min(0).max(100).nullable().optional(), completedRepetitions: z.number().int().min(0).max(1000).nullable().optional(), durationMinutes: z.number().int().min(0).max(1440).nullable().optional(), patientDifficulty: score.nullable().optional(), comment: z.string().trim().max(1000).nullable().optional() }).strict();
export const completionUpdateSchema = completionSchema.extend({ version: z.number().int().positive() }).strict();
export type DailyReportBody = z.infer<typeof dailyReportSchema>;
export type DailyReportUpdateBody = z.infer<typeof dailyReportUpdateSchema>;
export type CompletionBody = z.infer<typeof completionSchema>;
export type CompletionUpdateBody = z.infer<typeof completionUpdateSchema>;
export type MonitoringQuery = z.infer<typeof monitoringQuerySchema>;
