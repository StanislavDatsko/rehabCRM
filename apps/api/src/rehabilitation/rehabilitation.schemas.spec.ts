import { describe, expect, it } from 'vitest';
import { exerciseListQuerySchema, updatePlanBodySchema } from './rehabilitation.schemas';

const valid = {
  version: 1,
  revisionId: '00000000-0000-4000-8000-000000000001',
  title: 'План',
  startDate: '2026-09-02',
  goals: [],
  phases: [],
  exercisePrescriptions: [],
};

const prescription = {
  exerciseDefinitionId: '00000000-0000-4000-8000-000000000002',
  repetitions: 10,
  displayOrder: 0,
};

describe('rehabilitation aggregate validation', () => {
  it('accepts typed dosage with only a relevant field', () => {
    expect(
      updatePlanBodySchema.safeParse({ ...valid, exercisePrescriptions: [prescription] }).success,
    ).toBe(true);
  });

  it.each([{ sets: -1 }, { repetitions: 0 }, { durationSeconds: -10 }, { loadKg: -0.5 }])(
    'rejects invalid dosage %j',
    (invalid) => {
      expect(
        updatePlanBodySchema.safeParse({
          ...valid,
          exercisePrescriptions: [{ ...prescription, repetitions: undefined, ...invalid }],
        }).success,
      ).toBe(false);
    },
  );

  it('requires at least one dosage value', () => {
    expect(
      updatePlanBodySchema.safeParse({
        ...valid,
        exercisePrescriptions: [
          { exerciseDefinitionId: prescription.exerciseDefinitionId, displayOrder: 0 },
        ],
      }).success,
    ).toBe(false);
  });

  it('bounds exercise pagination', () => {
    expect(exerciseListQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
    expect(exerciseListQuerySchema.parse({ page: '2', pageSize: '20' })).toMatchObject({
      page: 2,
      pageSize: 20,
    });
  });
});
