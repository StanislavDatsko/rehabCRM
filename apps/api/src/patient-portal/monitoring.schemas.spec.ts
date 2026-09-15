import { describe, expect, it } from 'vitest';
import { completionSchema, dailyReportSchema, monitoringQuerySchema } from './monitoring.schemas';

describe('patient monitoring schemas', () => {
  it('bounds symptom scales and rejects ownership fields', () => {
    expect(dailyReportSchema.safeParse({ painScore: 11, fatigueLevel: 5, overallWellbeing: 5 }).success).toBe(false);
    expect(dailyReportSchema.safeParse({ painScore: 5, fatigueLevel: 5, overallWellbeing: 5, patientId: 'foreign' }).success).toBe(false);
  });
  it('bounds monitoring history queries', () => {
    expect(monitoringQuerySchema.parse({}).days).toBe(30);
    expect(monitoringQuerySchema.safeParse({ days: 31 }).success).toBe(false);
  });
  it('requires a prescribed exercise identity and bounded execution status', () => {
    expect(completionSchema.safeParse({ exercisePrescriptionId: 'not-uuid', status: 'COMPLETED' }).success).toBe(false);
    expect(completionSchema.safeParse({ exercisePrescriptionId: '00000000-0000-4000-8000-000000000001', status: 'COMPLETED', patientDifficulty: 12 }).success).toBe(false);
  });
});
