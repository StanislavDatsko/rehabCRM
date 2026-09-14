import type { BodyAnnotationStatus } from '@repo/contracts';

export function canTransitionAnnotation(
  from: BodyAnnotationStatus,
  to: BodyAnnotationStatus,
): boolean {
  return (
    (from === 'ACTIVE' && (to === 'RESOLVED' || to === 'VOIDED')) ||
    (from === 'RESOLVED' && to === 'VOIDED')
  );
}

export function isBarycentricAnchorValid(value: readonly number[], tolerance = 0.0001): boolean {
  return (
    value.length === 3 &&
    value.every((item) => Number.isFinite(item) && item >= 0 && item <= 1) &&
    Math.abs(value.reduce((sum, item) => sum + item, 0) - 1) < tolerance
  );
}
