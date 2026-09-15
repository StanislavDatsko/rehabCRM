'use server';
import { revalidatePath } from 'next/cache';
import { ServerApiError, serverApiFetch } from '../../lib/api/server-api-client';
export async function completeExercise(formData: FormData) {
  const exercisePrescriptionId = String(formData.get('exercisePrescriptionId') ?? '');
  try { await serverApiFetch('/api/v1/patient-portal/exercise-completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exercisePrescriptionId, status: 'COMPLETED' }) }); } catch (e) { if (e instanceof ServerApiError) return; return; }
  revalidatePath('/patient'); revalidatePath('/patient/exercises'); revalidatePath('/patient/progress');
}
