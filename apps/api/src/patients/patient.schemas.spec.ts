import { describe, expect, it } from 'vitest';
import {
  changePatientStatusBodySchema,
  createPatientBodySchema,
} from './patient.schemas';

describe('patient request validation', () => {
  it('rejects a client-supplied organizationId', () => {
    const result = createPatientBodySchema.safeParse({
      firstName: 'Іван',
      lastName: 'Тестенко',
      organizationId: 'a0e1c000-0000-4000-8000-000000000002',
    });
    expect(result.success).toBe(false);
  });

  it('rejects future and impossible birth dates', () => {
    expect(
      createPatientBodySchema.safeParse({
        firstName: 'Іван',
        lastName: 'Тестенко',
        dateOfBirth: '2999-01-01',
      }).success,
    ).toBe(false);
    expect(
      createPatientBodySchema.safeParse({
        firstName: 'Іван',
        lastName: 'Тестенко',
        dateOfBirth: '2026-02-31',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown statuses', () => {
    expect(
      changePatientStatusBodySchema.safeParse({
        status: 'DELETED',
        version: 1,
      }).success,
    ).toBe(false);
  });
});
