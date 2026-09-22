'use server';
import { revalidatePath } from 'next/cache';
import { serverApiFetch, ServerApiError } from '../../../lib/api/server-api-client';

export type EncounterExerciseState = { error: string | null; ok: boolean };
export async function addEncounterExerciseAction(_: EncounterExerciseState, formData: FormData): Promise<EncounterExerciseState> {
  const encounterId = String(formData.get('encounterId') ?? '');
  try {
    await serverApiFetch(`/api/v1/encounters/${encounterId}/exercise-logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      exerciseId: String(formData.get('exerciseId') ?? '') || null,
      exerciseName: String(formData.get('exerciseName') ?? '').trim() || null,
      sets: formData.get('sets') ? Number(formData.get('sets')) : null,
      repetitions: formData.get('repetitions') ? Number(formData.get('repetitions')) : null,
      weightKg: formData.get('weightKg') ? Number(formData.get('weightKg')) : null,
      durationMinutes: formData.get('durationMinutes') ? Number(formData.get('durationMinutes')) : null,
      specialistNote: String(formData.get('specialistNote') ?? '').trim() || null,
    }) });
    revalidatePath(`/app/encounters/${encounterId}`);
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error instanceof ServerApiError ? (error.body?.message ?? 'Не вдалося зберегти вправу.') : 'Не вдалося зберегти вправу.' };
  }
}
