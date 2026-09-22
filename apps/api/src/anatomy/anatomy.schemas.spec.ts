import { describe, expect, it } from 'vitest';
import { createAnnotationBodySchema, updateAnnotationBodySchema } from './anatomy.schemas';

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

describe('point note comments', () => {
  const pointNote = {
    ...input,
    type: 'OTHER',
    severity: null,
    title: null,
    note: 'Біль при максимальному згинанні плеча',
  };

  it('accepts a free-text point note anchored to the isolated mesh', () => {
    const parsed = createAnnotationBodySchema.safeParse(pointNote);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.note).toBe('Біль при максимальному згинанні плеча');
  });

  it.each([null, '', '   '])('rejects an OTHER point note whose comment is %j', (note) => {
    const result = createAnnotationBodySchema.safeParse({ ...pointNote, note });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['note']);
  });

  it('trims and caps the comment at the shared maximum length', () => {
    expect(createAnnotationBodySchema.safeParse({ ...pointNote, note: '  ok  ' }).success).toBe(
      true,
    );
    expect(
      createAnnotationBodySchema.safeParse({ ...pointNote, note: 'x'.repeat(3001) }).success,
    ).toBe(false);
  });

  it('keeps typed findings valid without free text', () => {
    expect(
      createAnnotationBodySchema.safeParse({ ...input, type: 'PAIN', title: null, note: null })
        .success,
    ).toBe(true);
  });

  it('rejects clearing the comment of an OTHER note on update', () => {
    const base = { version: 1, type: 'OTHER', severity: null, colorHex: null, title: null };
    expect(updateAnnotationBodySchema.safeParse({ ...base, note: 'Оновлений коментар' }).success).toBe(
      true,
    );
    expect(updateAnnotationBodySchema.safeParse({ ...base, note: '' }).success).toBe(false);
  });

  it.each([
    ['NaN anchor coordinate', { ...input.anchor, localPosition: [0, Number.NaN, 0] }],
    ['infinite anchor coordinate', { ...input.anchor, localPosition: [Number.POSITIVE_INFINITY, 0, 0] }],
    ['string anchor coordinate', { ...input.anchor, localPosition: ['0.1', 0.4, 0] }],
    ['two-component anchor', { ...input.anchor, localPosition: [0.1, 0.4] }],
    ['blank mesh key', { ...input.anchor, stableMeshKey: '   ' }],
  ])('rejects a point note with %s', (_label, anchor) => {
    expect(createAnnotationBodySchema.safeParse({ ...pointNote, anchor }).success).toBe(false);
  });
});
