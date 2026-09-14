import { describe, expect, it } from 'vitest';
import { createClinicalReportSchema, progressQuerySchema, timelineQuerySchema } from './progress.schemas';

describe('Phase 8 request validation', () => {
  it('rejects unbounded custom progress queries', () => {
    expect(progressQuerySchema.safeParse({ period: 'custom' }).success).toBe(false);
  });
  it('bounds timeline pagination', () => {
    expect(timelineQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false);
    expect(timelineQuerySchema.safeParse({ cursor: 'not a cursor' }).success).toBe(false);
  });
  it('requires at least one report section and ordered dates', () => {
    expect(createClinicalReportSchema.safeParse({ period: { from: '2026-09-03T00:00:00.000Z', to: '2026-09-02T00:00:00.000Z' }, sections: [] }).success).toBe(false);
  });
});
