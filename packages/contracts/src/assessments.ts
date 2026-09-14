import type { SchedulingPersonRef } from './scheduling';

export const ASSESSMENT_STATUSES = ['DRAFT', 'COMPLETED', 'VOIDED'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const MEASUREMENT_VALUE_TYPES = [
  'NUMBER',
  'INTEGER',
  'BOOLEAN',
  'SCALE',
  'TEXT',
  'CODED',
] as const;
export type MeasurementValueType = (typeof MEASUREMENT_VALUE_TYPES)[number];

export const MEASUREMENT_CATEGORIES = [
  'PAIN',
  'RANGE_OF_MOTION',
  'STRENGTH',
  'MOBILITY',
  'BALANCE',
  'ENDURANCE',
  'FUNCTIONAL_TEST',
  'OTHER',
] as const;
export type MeasurementCategory = (typeof MEASUREMENT_CATEGORIES)[number];

export const LATERALITIES = ['LEFT', 'RIGHT', 'BILATERAL', 'MIDLINE', 'NOT_APPLICABLE'] as const;
export type Laterality = (typeof LATERALITIES)[number];

export const ANATOMICAL_REGION_CODES = [
  'shoulder',
  'elbow',
  'wrist',
  'hip',
  'knee',
  'ankle',
  'cervical_spine',
  'thoracic_spine',
  'lumbar_spine',
] as const;
export type AnatomicalRegionCode = (typeof ANATOMICAL_REGION_CODES)[number];

export const UNIT_CODES = ['deg', 'cm', 'mm', 'm', 's', 'min', 'kg', 'repetition'] as const;
export type UnitCode = (typeof UNIT_CODES)[number];

export type MeasurementDefinitionResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: MeasurementCategory;
  valueType: MeasurementValueType;
  unit: UnitCode | null;
  minimumValue: number | null;
  maximumValue: number | null;
  allowedCodedValues: { code: string; label: string }[];
  anatomicalApplicability: 'REQUIRED' | 'OPTIONAL' | 'NOT_APPLICABLE';
};

export type AssessmentTemplateItemResponse = {
  id: string;
  displayOrder: number;
  required: boolean;
  defaultRegion: AnatomicalRegionCode | null;
  defaultLaterality: Laterality | null;
  definition: MeasurementDefinitionResponse;
};

export type AssessmentTemplateResponse = {
  id: string;
  code: string;
  revision: number;
  name: string;
  description: string | null;
  configurableSample: boolean;
  items: AssessmentTemplateItemResponse[];
};

export type MeasurementValue = number | boolean | string;

export type MeasurementResponse = {
  id: string;
  definition: MeasurementDefinitionResponse;
  templateItemId: string | null;
  anatomicalRegion: AnatomicalRegionCode | null;
  laterality: Laterality | null;
  sequenceNumber: number;
  value: MeasurementValue;
  note: string | null;
  performedAt: string;
};

export type AssessmentResponse = {
  id: string;
  patient: SchedulingPersonRef;
  encounter: { id: string; startedAt: string; status: string } | null;
  practitioner: SchedulingPersonRef;
  template: AssessmentTemplateResponse | null;
  title: string;
  status: AssessmentStatus;
  performedAt: string;
  completedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  summary: string | null;
  measurements: MeasurementResponse[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentListItem = Pick<
  AssessmentResponse,
  | 'id'
  | 'patient'
  | 'encounter'
  | 'practitioner'
  | 'title'
  | 'status'
  | 'performedAt'
  | 'completedAt'
  | 'version'
  | 'createdAt'
  | 'updatedAt'
> & {
  template: Pick<AssessmentTemplateResponse, 'id' | 'code' | 'revision' | 'name'> | null;
  measurementCount: number;
};

export type MeasurementHistoryPoint = {
  measurementId: string;
  definitionId: string;
  assessmentId: string;
  assessmentTitle: string;
  definitionCode: string;
  definitionName: string;
  valueType: MeasurementValueType;
  value: MeasurementValue;
  unit: UnitCode | null;
  anatomicalRegion: AnatomicalRegionCode | null;
  laterality: Laterality | null;
  sequenceNumber: number;
  performedAt: string;
};
