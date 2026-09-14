import { BadRequestException } from '@nestjs/common';
import type { MeasurementDefinition, Prisma } from '@prisma/client';
import type { MeasurementInput } from './assessment.schemas';

const UNIT_CODES = new Set(['deg', 'cm', 'mm', 'm', 's', 'min', 'kg', 'repetition']);

type ValueColumns = Pick<
  Prisma.MeasurementCreateManyInput,
  'numericValue' | 'textValue' | 'booleanValue' | 'codedValue'
>;

function invalid(message: string): never {
  throw new BadRequestException({ code: 'MEASUREMENT_INVALID_VALUE', message });
}

export function validateMeasurementValue(
  definition: MeasurementDefinition,
  input: MeasurementInput,
): ValueColumns {
  if (input.unit !== undefined && input.unit !== definition.unitCode) {
    throw new BadRequestException({
      code: 'MEASUREMENT_UNIT_MISMATCH',
      message: `Unit for ${definition.code} must match its definition.`,
    });
  }
  if (definition.unitCode && !UNIT_CODES.has(definition.unitCode)) {
    invalid(`Definition ${definition.code} has an unsupported unit.`);
  }

  const empty: ValueColumns = {
    numericValue: null,
    textValue: null,
    booleanValue: null,
    codedValue: null,
  };

  if (['NUMBER', 'INTEGER', 'SCALE'].includes(definition.valueType)) {
    if (typeof input.value !== 'number' || !Number.isFinite(input.value)) {
      invalid(`${definition.code} requires a numeric value.`);
    }
    if (definition.valueType !== 'NUMBER' && !Number.isInteger(input.value)) {
      invalid(`${definition.code} requires an integer value.`);
    }
    if (definition.minimumValue !== null && input.value < definition.minimumValue) {
      invalid(`${definition.code} is below its configured minimum.`);
    }
    if (definition.maximumValue !== null && input.value > definition.maximumValue) {
      invalid(`${definition.code} is above its configured maximum.`);
    }
    return { ...empty, numericValue: input.value };
  }

  if (definition.valueType === 'BOOLEAN') {
    if (typeof input.value !== 'boolean') {
      invalid(`${definition.code} requires a boolean value.`);
    }
    return { ...empty, booleanValue: input.value };
  }

  if (definition.valueType === 'TEXT') {
    if (typeof input.value !== 'string' || input.value.trim().length === 0) {
      invalid(`${definition.code} requires a non-empty text value.`);
    }
    return { ...empty, textValue: input.value.trim() };
  }

  if (typeof input.value !== 'string') {
    invalid(`${definition.code} requires a coded value.`);
  }
  const choices = Array.isArray(definition.allowedCodedValues)
    ? definition.allowedCodedValues
        .filter((choice): choice is { code: string } =>
          Boolean(
            choice &&
            typeof choice === 'object' &&
            'code' in choice &&
            typeof choice.code === 'string',
          ),
        )
        .map((choice) => choice.code)
    : [];
  if (!choices.includes(input.value)) {
    invalid(`${definition.code} contains an unsupported code.`);
  }
  return { ...empty, codedValue: input.value };
}
