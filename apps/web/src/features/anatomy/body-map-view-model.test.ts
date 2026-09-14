import type {
  AnatomicalMappingResponse,
  AnatomicalModelResponse,
  AnatomicalStructureResponse,
  BodyAnnotationResponse,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import {
  filterBodyAnnotations,
  renderTargetForStructure,
  searchAnatomicalStructures,
} from './body-map-view-model';

const structures = [
  {
    id: 'left-knee',
    code: 'knee.left',
    canonicalName: 'Knee',
    name: 'Ліве коліно',
    displayNameUk: 'Ліве коліно',
    displayNameEn: 'Left knee',
  },
  {
    id: 'right-shoulder',
    code: 'shoulder.right',
    canonicalName: 'Shoulder',
    name: 'Праве плече',
    displayNameUk: 'Праве плече',
    displayNameEn: 'Right shoulder',
  },
] as AnatomicalStructureResponse[];

const annotations = [
  {
    id: 'one',
    status: 'ACTIVE',
    type: 'PAIN',
    createdAt: '2026-09-02T08:00:00.000Z',
    structure: structures[0],
  },
  {
    id: 'two',
    status: 'RESOLVED',
    type: 'WEAKNESS',
    createdAt: '2026-08-15T08:00:00.000Z',
    structure: structures[1],
  },
] as BodyAnnotationResponse[];

describe('body-map view model', () => {
  it('searches stable codes and localized/canonical names case-insensitively', () => {
    expect(searchAnatomicalStructures(structures, 'KNEE').map((item) => item.id)).toEqual([
      'left-knee',
    ]);
    expect(searchAnatomicalStructures(structures, 'плече').map((item) => item.id)).toEqual([
      'right-shoulder',
    ]);
    expect(searchAnatomicalStructures(structures, 'shoulder.right')).toHaveLength(1);
  });

  it('filters the timeline by status, type, structure, and inclusive date range', () => {
    expect(
      filterBodyAnnotations(annotations, {
        status: 'ACTIVE',
        type: 'PAIN',
        structureId: 'left-knee',
        from: '2026-09-02',
        to: '2026-09-02',
      }).map((item) => item.id),
    ).toEqual(['one']);
    expect(
      filterBodyAnnotations(annotations, {
        status: 'ALL',
        type: 'ALL',
        structureId: null,
        from: '2026-09-03',
        to: '',
      }),
    ).toEqual([]);
  });

  it('resolves a selected structure only through its versioned render mapping', () => {
    const models = [
      { id: 'model', kind: 'JOINTS', activeVersion: { id: 'version' } },
    ] as AnatomicalModelResponse[];
    const mappings = [
      { id: 'mapping', structureId: 'left-knee', modelVersionId: 'version' },
    ] as AnatomicalMappingResponse[];
    expect(renderTargetForStructure(models, mappings, 'left-knee')).toMatchObject({
      mapping: { id: 'mapping' },
      layerKind: 'JOINTS',
    });
    expect(renderTargetForStructure(models, mappings, 'unknown')).toBeNull();
  });
});
