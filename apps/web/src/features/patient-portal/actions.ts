'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ServerApiError, serverApiFetch } from '../../lib/api/server-api-client';

export type DailyReportFormState = { error: string | null };
export async function submitDailyReport(_prev: DailyReportFormState, formData: FormData): Promise<DailyReportFormState> {
  const number = (name: string) => Number(formData.get(name));
  const body = { overallWellbeing: number('overallWellbeing'), fatigueLevel: number('fatigueLevel'), painScore: number('painScore'), comment: String(formData.get('comment') ?? '').trim() || null };
  if ([body.overallWellbeing, body.fatigueLevel, body.painScore].some((v) => !Number.isInteger(v) || v < 0 || v > 10)) return { error: 'Оберіть значення від 0 до 10 для кожної шкали.' };
  try { await serverApiFetch('/api/v1/patient-portal/daily-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (error) { if (error instanceof ServerApiError && error.body?.code === 'DAILY_REPORT_ALREADY_EXISTS') return { error: 'Звіт за сьогодні вже заповнено.' }; return { error: 'Не вдалося зберегти щоденний звіт.' }; }
  revalidatePath('/patient'); revalidatePath('/patient/daily-report'); revalidatePath('/patient/progress'); redirect('/patient?report=saved');
}
