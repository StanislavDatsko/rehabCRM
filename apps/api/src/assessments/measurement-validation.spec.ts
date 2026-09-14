import type { MeasurementDefinition } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { validateMeasurementValue } from './measurement-validation';

const pain = {
  id: 'definition',
  organizationId: null,
  code: 'pain.nrs',
  name: 'Pain',
  description: null,
  valueType: 'INTEGER',
  unitCode: null,
  minimumValue: 0,
  maximumValue: 10,
  allowedCodedValues: null,
  category: 'PAIN',
  anatomicalApplicability: 'OPTIONAL',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies MeasurementDefinition;

const input = { definitionId: '3ed4e370-9f4a-4f10-a648-01bb8b7336a0', value: 5, sequenceNumber: 1 };

describe('measurement value validation', () => {
  it('accepts a pain score within 0–10', () => {
    expect(validateMeasurementValue(pain, input).numericValue).toBe(5);
  });

  it.each([-1, 11])('rejects out-of-range pain score %s', (value) => {
    expect(() => validateMeasurementValue(pain, { ...input, value })).toThrowError();
  });

  it('rejects the wrong value type', () => {
    expect(() => validateMeasurementValue(pain, { ...input, value: 'high' })).toThrowError();
  });

  it('rejects a mismatched unit', () => {
    expect(() => validateMeasurementValue(pain, { ...input, unit: 'deg' })).toThrowError();
  });
});
