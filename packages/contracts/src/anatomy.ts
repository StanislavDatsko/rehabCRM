import type { Laterality } from './assessments';

export const ANATOMICAL_STRUCTURE_CATEGORIES = [
  'SYSTEM',
  'REGION',
  'BONE',
  'JOINT',
  'MUSCLE',
  'TENDON',
  'LIGAMENT',
  'OTHER',
] as const;
export type AnatomicalStructureCategory = (typeof ANATOMICAL_STRUCTURE_CATEGORIES)[number];

export const ANATOMICAL_MODEL_KINDS = [
  'MUSCULAR',
  'SKELETAL',
  'JOINTS',
  'COMBINED',
  'OTHER',
] as const;
export type AnatomicalModelKind = (typeof ANATOMICAL_MODEL_KINDS)[number];
export const BODY_ANNOTATION_TYPES = [
  'PAIN',
  'MOBILITY_LIMITATION',
  'WEAKNESS',
  'TENSION',
  'INFLAMMATION',
  'POST_SURGERY',
  'INJURY',
  'SENSITIVITY',
  'OTHER',
] as const;
export type BodyAnnotationType = (typeof BODY_ANNOTATION_TYPES)[number];
export const BODY_ANNOTATION_STATUSES = ['ACTIVE', 'RESOLVED', 'VOIDED'] as const;
export type BodyAnnotationStatus = (typeof BODY_ANNOTATION_STATUSES)[number];

export type AnatomicalStructureResponse = {
  id: string;
  code: string;
  canonicalName: string;
  name: string;
  displayNameUk: string | null;
  displayNameEn: string | null;
  category: AnatomicalStructureCategory;
  laterality: Laterality;
  regionCode: string | null;
  parentId: string | null;
  active: boolean;
};

export type AnatomicalMappingResponse = {
  id: string;
  modelVersionId: string;
  structureId: string;
  nodeName: string;
  meshName: string;
  primitiveIndex: number;
  stableMeshKey: string;
  sourcePartId?: string | null;
  confidence: 'EXACT' | 'HIGH_CONFIDENCE' | 'MANUAL_REQUIRED';
};

export type AnatomicalModelVersionResponse = {
  id: string;
  modelId: string;
  version: number;
  checksumSha256: string;
  bytes: number;
  format: 'GLB' | 'ATLAS';
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  assetUrl: string;
  assetUrlExpiresAt: string;
};

export type AnatomicalModelResponse = {
  id: string;
  code: string;
  name: string;
  kind: AnatomicalModelKind;
  activeVersion: AnatomicalModelVersionResponse | null;
};

export type SurfaceAnchor = {
  stableMeshKey: string;
  primitiveIndex: number;
  triangleIndex: number;
  barycentric: [number, number, number];
  localPosition: [number, number, number];
  localNormal: [number, number, number] | null;
};

export type BodyAnnotationHistoryItem = {
  id: string;
  fromStatus: BodyAnnotationStatus | null;
  toStatus: BodyAnnotationStatus;
  reason: string | null;
  changedAt: string;
  changedBy: { id: string; displayName: string };
};

export type BodyAnnotationResponse = {
  id: string;
  patientId: string;
  encounterId: string | null;
  structure: AnatomicalStructureResponse;
  modelVersionId: string;
  mappingId: string;
  type: BodyAnnotationType;
  severity: number | null;
  title: string | null;
  note: string | null;
  status: BodyAnnotationStatus;
  anchor: SurfaceAnchor;
  version: number;
  resolvedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; practitionerId: string; displayName: string };
  history: BodyAnnotationHistoryItem[];
};

export type BodyMapClinicalContext = {
  structureId: string;
  measurements: Array<{ id: string; name: string; value: string; performedAt: string }>;
  goals: Array<{ id: string; title: string; status: string; planId: string }>;
  exercises: Array<{ id: string; name: string; dosage: string; planId: string }>;
};

export type PatientBodyMapResponse = {
  patient: { id: string; fullName: string };
  structures: AnatomicalStructureResponse[];
  models: AnatomicalModelResponse[];
  mappings: AnatomicalMappingResponse[];
  annotations: BodyAnnotationResponse[];
  annotationWindow: { limit: number; returned: number; total: number; truncated: boolean };
  clinicalContext: BodyMapClinicalContext[];
  annotationSummaryByStructure: Array<{
    structureId: string;
    activeCount: number;
    maximumSeverity: number | null;
    lastAnnotatedAt: string;
  }>;
  summary: {
    active: number;
    resolved: number;
    voided: number;
    maximumSeverity: number | null;
    latestRegions: string[];
    lastUpdatedAt: string | null;
  };
};
