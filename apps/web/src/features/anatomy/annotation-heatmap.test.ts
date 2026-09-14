import { describe, expect, it } from 'vitest';
import { maximumActiveSeverityByStructure } from './annotation-heatmap';

describe('annotation heatmap aggregation', () => {
  it('returns deterministic values for asymmetric structures', () => {
    const annotations = [
      { status: 'ACTIVE', severity: 8, structure: { id: 'left-knee' } },
      { status: 'ACTIVE', severity: 2, structure: { id: 'right-knee' } },
      { status: 'RESOLVED', severity: 10, structure: { id: 'left-knee' } },
    ];

    expect(Object.fromEntries(maximumActiveSeverityByStructure(annotations as never))).toEqual({
      'left-knee': 8,
      'right-knee': 2,
    });
  });

  it('handles at least 100 annotations and excludes historical states', () => {
    const annotations = Array.from({ length: 120 }, (_, index) => ({
      status: index % 11 === 0 ? 'RESOLVED' : 'ACTIVE',
      severity: index % 11,
      structure: { id: `structure-${index % 4}` },
    }));
    const result = maximumActiveSeverityByStructure(annotations as never);
    expect(result.size).toBe(4);
    expect(Math.max(...result.values())).toBe(10);
  });
});
