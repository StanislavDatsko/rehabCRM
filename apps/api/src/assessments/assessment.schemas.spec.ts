import { describe, expect, it } from 'vitest';
import { createAssessmentBodySchema, measurementInputSchema } from './assessment.schemas';

describe('assessment request schemas', () => {
  it('rejects a future performedAt', () => {
    expect(
      createAssessmentBodySchema.safeParse({
        title: 'Test',
        performedAt: '2999-01-01T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown laterality values', () => {
    expect(
      measurementInputSchema.safeParse({
        definitionId: '3ed4e370-9f4a-4f10-a648-01bb8b7336a0',
        value: 5,
        laterality: 'SOMETIMES',
      }).success,
    ).toBe(false);
  });
});
