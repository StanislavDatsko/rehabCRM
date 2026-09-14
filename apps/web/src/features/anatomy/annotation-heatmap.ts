import type { BodyAnnotationResponse } from '@repo/contracts';

export function maximumActiveSeverityByStructure(
  annotations: readonly BodyAnnotationResponse[],
): Map<string, number> {
  const result = new Map<string, number>();
  for (const annotation of annotations) {
    if (annotation.status !== 'ACTIVE' || annotation.severity === null) continue;
    result.set(
      annotation.structure.id,
      Math.max(result.get(annotation.structure.id) ?? 0, annotation.severity),
    );
  }
  return result;
}
