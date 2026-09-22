import { describe, expect, it } from 'vitest';
import { validatePointAnnotationInput, type PointAnnotationInput } from './input';

const input: PointAnnotationInput = {
  patientId: 'd1000000-0000-4000-8000-000000000001',
  structureId: 'a7000000-0000-4000-8000-000000000001',
  modelVersionId: 'a7100000-0000-4000-8000-000000000010',
  mappingId: 'a7200000-0000-4000-8000-000000000001',
  anchor: {
    stableMeshKey: 'FJ2000',
    primitiveIndex: 0,
    triangleIndex: 12,
    barycentric: [0.2, 0.3, 0.5],
    localPosition: [0.1, 1.2, 0.05],
    localNormal: [0, 0, 1],
  },
  comment: '  Біль при максимальному згинанні плеча ',
};

describe('validatePointAnnotationInput', () => {
  it('trims the comment and normalises a missing encounter', () => {
    const result = validatePointAnnotationInput(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.comment).toBe('Біль при максимальному згинанні плеча');
      expect(result.value.encounterId).toBeNull();
    }
  });

  it.each(['', '   ', '\n'])('rejects the empty comment %j', (comment) => {
    expect(validatePointAnnotationInput({ ...input, comment }).ok).toBe(false);
  });

  it('rejects non-finite or malformed anchors and foreign identifiers', () => {
    expect(
      validatePointAnnotationInput({
        ...input,
        anchor: { ...input.anchor, localPosition: [Number.NaN, 0, 0] },
      }).ok,
    ).toBe(false);
    expect(
      validatePointAnnotationInput({ ...input, anchor: { ...input.anchor, triangleIndex: -1 } }).ok,
    ).toBe(false);
    expect(validatePointAnnotationInput({ ...input, mappingId: 'not-a-uuid' }).ok).toBe(false);
    expect(validatePointAnnotationInput({ ...input, comment: 'x'.repeat(3001) }).ok).toBe(false);
  });
});
