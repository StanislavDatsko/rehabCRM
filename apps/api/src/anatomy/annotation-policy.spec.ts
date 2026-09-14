import { describe, expect, it } from 'vitest';
import { canTransitionAnnotation, isBarycentricAnchorValid } from './annotation-policy';

describe('body annotation policy', () => {
  it('allows explicit terminal transitions and no reopen or unvoid', () => {
    expect(canTransitionAnnotation('ACTIVE', 'RESOLVED')).toBe(true);
    expect(canTransitionAnnotation('ACTIVE', 'VOIDED')).toBe(true);
    expect(canTransitionAnnotation('RESOLVED', 'VOIDED')).toBe(true);
    expect(canTransitionAnnotation('RESOLVED', 'ACTIVE')).toBe(false);
    expect(canTransitionAnnotation('VOIDED', 'ACTIVE')).toBe(false);
  });

  it('validates normalized barycentric coordinates', () => {
    expect(isBarycentricAnchorValid([0.2, 0.3, 0.5])).toBe(true);
    expect(isBarycentricAnchorValid([0.2, 0.3, 0.6])).toBe(false);
    expect(isBarycentricAnchorValid([-0.1, 0.4, 0.7])).toBe(false);
  });
});
