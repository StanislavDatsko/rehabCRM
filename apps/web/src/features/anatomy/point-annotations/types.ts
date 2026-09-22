import type { BodyAnnotationResponse, SurfaceAnchor, Vec3 } from '@repo/contracts';
import { BODY_ANNOTATION_TYPE_LABELS } from '../anatomy-ui';

export type { SurfaceAnchor, Vec3 };

/** Projection of a persisted BodyAnnotation onto the isolated-structure point layer. */
export type PointAnnotationView = {
  id: string;
  patientId: string;
  structureId: string;
  structureName: string;
  /** Human Atlas source part (stableMeshKey) that owns the anchored triangle. */
  partId: string;
  anchor: SurfaceAnchor;
  comment: string;
  status: 'ACTIVE' | 'RESOLVED';
  version: number;
  color: string | null;
  createdAt: string;
  createdBy: string;
};

/** Local, unsaved point note. Never reaches the API until the user saves it. */
export type PointDraft = {
  partId: string;
  structureId: string;
  structureName: string;
  mappingId: string;
  modelVersionId: string;
  anchor: SurfaceAnchor;
  comment: string;
  error: string | null;
  saving: boolean;
};

export const DRAFT_MARKER_ID = 'draft';

export function toPointAnnotationView(
  annotation: BodyAnnotationResponse,
): PointAnnotationView | null {
  if (annotation.status === 'VOIDED') return null;
  return {
    id: annotation.id,
    patientId: annotation.patientId,
    structureId: annotation.structure.id,
    structureName: annotation.structure.name,
    partId: annotation.anchor.stableMeshKey,
    anchor: annotation.anchor,
    comment:
      annotation.note ?? annotation.title ?? BODY_ANNOTATION_TYPE_LABELS[annotation.type],
    status: annotation.status,
    version: annotation.version,
    color: annotation.colorHex,
    createdAt: annotation.createdAt,
    createdBy: annotation.createdBy.displayName,
  };
}
