import { describe, expect, it } from 'vitest';
import { annotationMarkerColor, annotationMarkerLabel } from './annotation-marker';

describe('annotation marker presentation', () => {
  it('uses deterministic neutral/severity colors without treating color as the label', () => {
    const base = { status: 'ACTIVE', type: 'PAIN', structure: { name: 'Left knee' } };
    expect(annotationMarkerColor({ ...base, severity: null } as never)).toBe('#0ea5e9');
    expect(annotationMarkerColor({ ...base, severity: 2 } as never)).toBe('#22c55e');
    expect(annotationMarkerColor({ ...base, severity: 5 } as never)).toBe('#f59e0b');
    expect(annotationMarkerColor({ ...base, severity: 8 } as never)).toBe('#dc2626');
    expect(annotationMarkerColor({ ...base, severity: 8, status: 'RESOLVED' } as never)).toBe(
      '#64748b',
    );
  });

  it('includes structure, type, severity, and lifecycle in its accessible label', () => {
    expect(
      annotationMarkerLabel({
        status: 'ACTIVE',
        type: 'MOBILITY_LIMITATION',
        severity: 4,
        structure: { name: 'Left knee' },
      } as never),
    ).toBe('Left knee: mobility limitation, 4/10, active');
  });
});
