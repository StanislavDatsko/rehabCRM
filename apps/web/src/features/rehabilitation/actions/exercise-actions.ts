'use server';

import { serverApiFetch, ServerApiError } from '../../../lib/api/server-api-client';

export type ExerciseCreateState = { error: string | null; ok: boolean };

export async function createExerciseAction(_: ExerciseCreateState, formData: FormData): Promise<ExerciseCreateState> {
  try {
    await serverApiFetch('/api/v1/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: String(formData.get('code') ?? ''), name: String(formData.get('name') ?? ''), description: String(formData.get('description') ?? ''), instructions: String(formData.get('instructions') ?? ''), category: String(formData.get('category') ?? 'OTHER'), difficulty: String(formData.get('difficulty') ?? '') || null,
        anatomicalRegionCodes: String(formData.get('anatomicalRegionCodes') ?? '').split(',').map((value) => value.trim()).filter(Boolean), targetMuscleGroupCodes: String(formData.get('targetMuscleGroupCodes') ?? '').split(',').map((value) => value.trim()).filter(Boolean), equipment: String(formData.get('equipment') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
      }),
    });
    return { error: null, ok: true };
  } catch (error) {
    if (error instanceof ServerApiError) {
      const fields = error.body?.fields ? Object.entries(error.body.fields).map(([field, message]) => `${field}: ${message}`).join(' ') : '';
      return { error: fields || error.body?.message || 'Не вдалося створити вправу.', ok: false };
    }
    return { error: error instanceof Error ? error.message : 'Не вдалося створити вправу.', ok: false };
  }
}
