import type { BodyAnnotationResponse, BodyAnnotationType } from '@repo/contracts';

export const ANNOTATION_TYPE_ICONS: Record<BodyAnnotationType, string> = {
  PAIN: '!',
  MOBILITY_LIMITATION: '↔',
  WEAKNESS: 'W',
  TENSION: 'T',
  INFLAMMATION: 'I',
  POST_SURGERY: '+',
  INJURY: '×',
  SENSITIVITY: 'S',
  OTHER: '•',
};

export function annotationMarkerColor(annotation: BodyAnnotationResponse): string {
  if (annotation.status === 'RESOLVED') return '#64748b';
  if (annotation.severity === null) return '#0ea5e9';
  if (annotation.severity >= 7) return '#dc2626';
  if (annotation.severity >= 4) return '#f59e0b';
  return '#22c55e';
}

export function annotationMarkerLabel(annotation: BodyAnnotationResponse): string {
  const type = annotation.type.toLowerCase().replaceAll('_', ' ');
  const severity =
    annotation.severity === null ? 'severity not recorded' : `${annotation.severity}/10`;
  return `${annotation.structure.name}: ${type}, ${severity}, ${annotation.status.toLowerCase()}`;
}
