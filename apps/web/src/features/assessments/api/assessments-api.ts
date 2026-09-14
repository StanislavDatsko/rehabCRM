import 'server-only';

import type {
  AssessmentListItem,
  AssessmentResponse,
  AssessmentStatus,
  AssessmentTemplateResponse,
  AnatomicalRegionCode,
  Laterality,
  MeasurementHistoryPoint,
  UnitCode,
} from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export type MeasurementInput = {
  definitionId: string;
  templateItemId?: string | null;
  anatomicalRegion?: AnatomicalRegionCode | null;
  laterality?: Laterality | null;
  sequenceNumber: number;
  value: number | boolean | string;
  unit?: UnitCode | null;
  note?: string | null;
};

export async function listAssessmentTemplates(): Promise<AssessmentTemplateResponse[]> {
  return serverApiFetch('/api/v1/assessment-templates');
}

export async function listPatientAssessments(
  patientId: string,
  filters: { status?: AssessmentStatus; templateId?: string; from?: string; to?: string } = {},
): Promise<AssessmentListItem[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  const suffix = params.size ? `?${params.toString()}` : '';
  return serverApiFetch(`/api/v1/patients/${patientId}/assessments${suffix}`);
}

export async function createAssessment(
  patientId: string,
  body: {
    encounterId?: string | null;
    templateId?: string | null;
    title?: string;
    performedAt?: string;
  },
): Promise<AssessmentResponse> {
  return serverApiFetch(`/api/v1/patients/${patientId}/assessments`, jsonInit('POST', body));
}

export async function getAssessment(id: string): Promise<AssessmentResponse> {
  return serverApiFetch(`/api/v1/assessments/${id}`);
}

export async function updateAssessment(
  id: string,
  body: {
    version: number;
    title?: string;
    performedAt?: string;
    summary?: string | null;
    measurements: MeasurementInput[];
  },
): Promise<AssessmentResponse> {
  return serverApiFetch(`/api/v1/assessments/${id}`, jsonInit('PATCH', body));
}

export async function completeAssessment(id: string, version: number): Promise<AssessmentResponse> {
  return serverApiFetch(`/api/v1/assessments/${id}/complete`, jsonInit('POST', { version }));
}

export async function voidAssessment(
  id: string,
  version: number,
  reason: string,
): Promise<AssessmentResponse> {
  return serverApiFetch(`/api/v1/assessments/${id}/void`, jsonInit('POST', { version, reason }));
}

export async function getMeasurementHistory(
  patientId: string,
  filters: {
    definitionCode?: string;
    region?: AnatomicalRegionCode;
    laterality?: Laterality;
    from?: string;
    to?: string;
  } = {},
): Promise<MeasurementHistoryPoint[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  const suffix = params.size ? `?${params.toString()}` : '';
  return serverApiFetch(`/api/v1/patients/${patientId}/measurements/history${suffix}`);
}
