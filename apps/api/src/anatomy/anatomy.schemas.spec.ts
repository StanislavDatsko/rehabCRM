import { describe, expect, it } from 'vitest';
import { createAnnotationBodySchema } from './anatomy.schemas';

const input = {
  structureId: 'a7000000-0000-4000-8000-000000000001',
  modelVersionId: 'a7100000-0000-4000-8000-000000000001',
  mappingId: 'a7200000-0000-4000-8000-000000000001',
  type: 'PAIN',
  severity: 7,
  title: 'Lateral knee pain',
  note: null,
  anchor: {
    stableMeshKey: 'Articular capsule of knee joint.l',
    primitiveIndex: 0,
    triangleIndex: 42,
    barycentric: [0.2, 0.3, 0.5],
    localPosition: [0.1, 0.4, 0],
    localNormal: [0, 0, 1],
  },
};

describe('createAnnotationBodySchema', () => {
  it('accepts a versioned triangle+barycentric surface anchor', () => {
    expect(createAnnotationBodySchema.safeParse(input).success).toBe(true);
  });

  it('rejects invalid severity and denormalized anchors', () => {
    expect(createAnnotationBodySchema.safeParse({ ...input, severity: 11 }).success).toBe(false);
    expect(
      createAnnotationBodySchema.safeParse({
        ...input,
        anchor: { ...input.anchor, barycentric: [0.3, 0.3, 0.3] },
      }).success,
    ).toBe(false);
  });

  it.each([
    ['negative triangle index', { ...input.anchor, triangleIndex: -1 }],
    ['NaN local position', { ...input.anchor, localPosition: [Number.NaN, 0.4, 0] }],
    ['infinite local normal', { ...input.anchor, localNormal: [0, 0, Number.POSITIVE_INFINITY] }],
  ])('rejects %s', (_label, anchor) => {
    expect(createAnnotationBodySchema.safeParse({ ...input, anchor }).success).toBe(false);
  });
});
