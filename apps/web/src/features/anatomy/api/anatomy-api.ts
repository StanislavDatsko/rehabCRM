import 'server-only';
import type {
  BodyAnnotationResponse,
  BodyAnnotationStatus,
  BodyAnnotationType,
  PatientBodyMapResponse,
  SurfaceAnchor,
} from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function getPatientBodyMap(patientId: string): Promise<PatientBodyMapResponse> {
  return serverApiFetch(`/api/v1/patients/${patientId}/body-map`);
}

export function createBodyAnnotation(
  patientId: string,
  body: {
    encounterId?: string | null;
    structureId: string;
    modelVersionId: string;
    mappingId: string;
    type: BodyAnnotationType;
    severity: number | null;
    title: string | null;
    note: string | null;
    anchor: SurfaceAnchor;
  },
): Promise<BodyAnnotationResponse> {
  return serverApiFetch(`/api/v1/patients/${patientId}/body-annotations`, json('POST', body));
}

export function updateBodyAnnotation(
  id: string,
  body: {
    version: number;
    type: BodyAnnotationType;
    severity: number | null;
    title: string | null;
    note: string | null;
  },
): Promise<BodyAnnotationResponse> {
  return serverApiFetch(`/api/v1/body-annotations/${id}`, json('PATCH', body));
}

export function transitionBodyAnnotation(
  id: string,
  action: 'resolve' | 'void',
  version: number,
  reason: string | null,
): Promise<BodyAnnotationResponse> {
  return serverApiFetch(
    `/api/v1/body-annotations/${id}/${action}`,
    json('POST', { version, reason }),
  );
}

export type AnnotationFilters = {
  status?: BodyAnnotationStatus;
  type?: BodyAnnotationType;
  structureId?: string;
  encounterId?: string;
  from?: string;
  to?: string;
};
