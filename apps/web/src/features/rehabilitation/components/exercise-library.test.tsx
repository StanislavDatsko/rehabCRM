import type { ExerciseLibraryResponse } from '@repo/contracts';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExerciseLibrary } from './exercise-library';

const result: ExerciseLibraryResponse = {
  page: 1,
  pageSize: 12,
  total: 1,
  totalPages: 1,
  items: [
    {
      id: 'exercise-1',
      code: 'knee.heel-slide',
      name: 'Ковзання пʼятою',
      description: 'Рух коліна',
      category: 'MOBILITY',
      difficulty: 'FOUNDATIONAL',
      anatomicalRegions: ['knee'],
      targetMuscleGroups: ['quadriceps'],
      equipment: ['килимок'],
      supportedDosageKinds: ['SETS_REPETITIONS'],
      active: true,
      mediaPreview: null,
    },
  ],
};

describe('ExerciseLibrary', () => {
  it('renders server-filter controls and projected exercise cards', () => {
    const html = renderToStaticMarkup(
      <ExerciseLibrary result={result} filters={{ search: 'пʼятою' }} />,
    );
    expect(html).toContain('name="search"');
    expect(html).toContain('name="category"');
    expect(html).toContain('name="anatomicalRegion"');
    expect(html).toContain('name="equipment"');
    expect(html).toContain('Ковзання пʼятою');
    expect(html).toContain('/app/exercises/exercise-1');
  });
});
