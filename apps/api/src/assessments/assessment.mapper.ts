import type {
  AssessmentListItem,
  AssessmentResponse,
  AssessmentTemplateResponse,
  MeasurementDefinitionResponse,
  MeasurementHistoryPoint,
  MeasurementValue,
} from '@repo/contracts';
import type { Prisma } from '@prisma/client';

export const TEMPLATE_INCLUDE = {
  items: {
    include: { measurementDefinition: true },
    orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.AssessmentTemplateInclude;

export const ASSESSMENT_INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, middleName: true } },
  practitioner: { include: { user: { select: { id: true, displayName: true } } } },
  encounter: { select: { id: true, startedAt: true, status: true } },
  template: { include: TEMPLATE_INCLUDE },
  measurements: {
    include: { definition: true },
    orderBy: [
      { templateItemId: 'asc' as const },
      { sequenceNumber: 'asc' as const },
      { id: 'asc' as const },
    ],
  },
} satisfies Prisma.AssessmentInclude;

export type AssessmentWithRelations = Prisma.AssessmentGetPayload<{
  include: typeof ASSESSMENT_INCLUDE;
}>;
export type TemplateWithItems = Prisma.AssessmentTemplateGetPayload<{
  include: typeof TEMPLATE_INCLUDE;
}>;

function allowedValues(value: Prisma.JsonValue | null): { code: string; label: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const code = item.code;
    const label = item.label;
    return typeof code === 'string' && typeof label === 'string' ? [{ code, label }] : [];
  });
}

export function toDefinitionResponse(
  row: TemplateWithItems['items'][number]['measurementDefinition'],
): MeasurementDefinitionResponse {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category,
    valueType: row.valueType,
    unit: row.unitCode as MeasurementDefinitionResponse['unit'],
    minimumValue: row.minimumValue,
    maximumValue: row.maximumValue,
    allowedCodedValues: allowedValues(row.allowedCodedValues),
    anatomicalApplicability: row.anatomicalApplicability,
  };
}

export function toTemplateResponse(row: TemplateWithItems): AssessmentTemplateResponse {
  return {
    id: row.id,
    code: row.code,
    revision: row.revision,
    name: row.name,
    description: row.description,
    configurableSample: row.configurableSample,
    items: row.items.map((item) => ({
      id: item.id,
      displayOrder: item.displayOrder,
      required: item.required,
      defaultRegion:
        item.defaultRegionCode as AssessmentTemplateResponse['items'][number]['defaultRegion'],
      defaultLaterality: item.defaultLaterality,
      definition: toDefinitionResponse(item.measurementDefinition),
    })),
  };
}

function patientName(patient: AssessmentWithRelations['patient']): string {
  return [patient.lastName, patient.firstName, patient.middleName].filter(Boolean).join(' ');
}

function measurementValue(row: AssessmentWithRelations['measurements'][number]): MeasurementValue {
  if (row.numericValue !== null) return row.numericValue;
  if (row.booleanValue !== null) return row.booleanValue;
  if (row.codedValue !== null) return row.codedValue;
  return row.textValue ?? '';
}

export function toAssessmentResponse(row: AssessmentWithRelations): AssessmentResponse {
  return {
    id: row.id,
    patient: { id: row.patient.id, displayName: patientName(row.patient) },
    encounter: row.encounter
      ? {
          id: row.encounter.id,
          startedAt: row.encounter.startedAt.toISOString(),
          status: row.encounter.status,
        }
      : null,
    practitioner: { id: row.practitioner.id, displayName: row.practitioner.user.displayName },
    template: row.template ? toTemplateResponse(row.template) : null,
    title: row.title,
    status: row.status,
    performedAt: row.performedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidReason: row.voidReason,
    summary: row.summary,
    measurements: row.measurements.map((measurement) => ({
      id: measurement.id,
      definition: {
        ...toDefinitionResponse(measurement.definition),
        code: measurement.definitionCode,
        name: measurement.definitionName,
        category: measurement.categorySnapshot,
        valueType: measurement.valueTypeSnapshot,
        unit: measurement.unitCodeSnapshot as MeasurementDefinitionResponse['unit'],
        minimumValue: measurement.minimumValueSnapshot,
        maximumValue: measurement.maximumValueSnapshot,
      },
      templateItemId: measurement.templateItemId,
      anatomicalRegion:
        measurement.anatomicalRegionCode as AssessmentResponse['measurements'][number]['anatomicalRegion'],
      laterality: measurement.laterality,
      sequenceNumber: measurement.sequenceNumber,
      value: measurementValue(measurement),
      note: measurement.note,
      performedAt: measurement.performedAt.toISOString(),
    })),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAssessmentListItem(row: AssessmentWithRelations): AssessmentListItem {
  const full = toAssessmentResponse(row);
  return {
    id: full.id,
    patient: full.patient,
    encounter: full.encounter,
    practitioner: full.practitioner,
    title: full.title,
    status: full.status,
    performedAt: full.performedAt,
    completedAt: full.completedAt,
    version: full.version,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
    template: full.template
      ? {
          id: full.template.id,
          code: full.template.code,
          revision: full.template.revision,
          name: full.template.name,
        }
      : null,
    measurementCount: full.measurements.length,
  };
}

export function toHistoryPoint(
  row: AssessmentWithRelations['measurements'][number] & {
    assessment: { id: string; title: string };
  },
): MeasurementHistoryPoint {
  return {
    measurementId: row.id,
    definitionId: row.definitionId,
    assessmentId: row.assessment.id,
    assessmentTitle: row.assessment.title,
    definitionCode: row.definitionCode,
    definitionName: row.definitionName,
    valueType: row.valueTypeSnapshot,
    value: measurementValue(row),
    unit: row.unitCodeSnapshot as MeasurementHistoryPoint['unit'],
    anatomicalRegion: row.anatomicalRegionCode as MeasurementHistoryPoint['anatomicalRegion'],
    laterality: row.laterality,
    sequenceNumber: row.sequenceNumber,
    performedAt: row.performedAt.toISOString(),
  };
}
