import type { AnatomicalStructureResponse, BodyMapClinicalContext } from '@repo/contracts';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StructureInspector } from './structure-inspector';

const structure = {
  id: 'left-knee',
  code: 'knee.left',
  canonicalName: 'Knee',
  name: 'Ліве коліно',
  displayNameUk: 'Ліве коліно',
  displayNameEn: 'Left knee',
  category: 'REGION',
  laterality: 'LEFT',
  regionCode: 'knee',
  parentId: 'body',
  active: true,
} satisfies AnatomicalStructureResponse;

const context = {
  structureId: structure.id,
  measurements: [{ id: 'm', name: 'Flexion', value: '110 deg', performedAt: '2026-09-03' }],
  goals: [{ id: 'g', title: 'Reach 120°', status: 'ACTIVE', planId: 'plan' }],
  exercises: [{ id: 'e', name: 'Heel slide', dosage: '3 × 10', planId: 'plan' }],
} satisfies BodyMapClinicalContext;

describe('structure inspector', () => {
  it('exposes overview, annotations, measurements, goals, and exercises as accessible tabs', () => {
    const html = renderToStaticMarkup(
      <StructureInspector structure={structure} context={context} annotations={[]} />,
    );
    for (const label of ['Огляд', 'Позначки', 'Вимірювання', 'Цілі', 'Вправи'])
      expect(html).toContain(label);
    expect(html).toContain('knee.left');
    expect(html).toContain('role="tablist"');
  });
});
