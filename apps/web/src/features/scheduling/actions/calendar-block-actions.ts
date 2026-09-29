'use server';
import { revalidatePath } from 'next/cache';
import { ServerApiError, serverApiFetch } from '../../../lib/api/server-api-client';
import { addMinutesToIso, combineDateAndTimeToIso } from '../timezone';
export type CalendarBlockFormState = { error: string | null; success?: boolean };
export async function createCalendarBlockAction(_prev: CalendarBlockFormState, formData: FormData): Promise<CalendarBlockFormState> {
  const type = String(formData.get('type') ?? 'BREAK'); const date = String(formData.get('date') ?? ''); const timezone = String(formData.get('timezone') ?? 'Europe/Kyiv');
  const start = combineDateAndTimeToIso(date, type === 'DAY_OFF' ? '00:00' : String(formData.get('startTime') ?? ''), timezone);
  const end = type === 'DAY_OFF' ? addMinutesToIso(start, 24 * 60) : combineDateAndTimeToIso(date, String(formData.get('endTime') ?? ''), timezone);
  try { await serverApiFetch('/api/v1/calendar-blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ practitionerId: String(formData.get('practitionerId') ?? ''), type, startsAt: start, endsAt: end, title: String(formData.get('title') ?? '').trim() || null, note: String(formData.get('note') ?? '').trim() || null }) }); revalidatePath('/app/calendar'); return { error: null, success: true }; } catch (error) { if (error instanceof ServerApiError && error.status === 409) return { error: error.body?.code === 'CALENDAR_BLOCK_APPOINTMENT_CONFLICT' ? 'У вибраному проміжку вже є запис. Спочатку перенесіть або скасуйте його.' : 'Цей час уже позначений як недоступний.' }; return { error: 'Не вдалося додати недоступність.' }; }
}

async function blockRequest(id: string, method: 'PATCH' | 'DELETE', body?: unknown) {
  return serverApiFetch(`/api/v1/calendar-blocks/${id}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
}
export async function updateCalendarBlockAction(_prev: CalendarBlockFormState, formData: FormData): Promise<CalendarBlockFormState> {
  const type = String(formData.get('type') ?? 'BREAK'); const date = String(formData.get('date') ?? ''); const timezone = String(formData.get('timezone') ?? 'Europe/Kyiv'); const start = combineDateAndTimeToIso(date, type === 'DAY_OFF' ? '00:00' : String(formData.get('startTime') ?? ''), timezone); const end = type === 'DAY_OFF' ? addMinutesToIso(start, 24 * 60) : combineDateAndTimeToIso(date, String(formData.get('endTime') ?? ''), timezone);
  try { await blockRequest(String(formData.get('id')), 'PATCH', { practitionerId: String(formData.get('practitionerId')), type, startsAt: start, endsAt: end, title: String(formData.get('title') ?? '').trim() || null, note: String(formData.get('note') ?? '').trim() || null, version: Number(formData.get('version')) }); revalidatePath('/app/calendar'); return { error: null, success: true }; } catch (error) { if (error instanceof ServerApiError && error.status === 409) return { error: error.body?.code === 'CALENDAR_BLOCK_UPDATE_CONFLICT' ? 'Цей запис уже був змінений. Оновіть календар і спробуйте ще раз.' : error.body?.code === 'CALENDAR_BLOCK_APPOINTMENT_CONFLICT' ? 'У вибраному проміжку вже є запис. Спочатку перенесіть або скасуйте його.' : 'Цей час уже позначений як недоступний.' }; return { error: 'Не вдалося оновити недоступність.' }; }
}
export async function deleteCalendarBlockAction(_prev: CalendarBlockFormState, formData: FormData): Promise<CalendarBlockFormState> {
  try { await blockRequest(String(formData.get('id')), 'DELETE'); revalidatePath('/app/calendar'); return { error: null, success: true }; } catch { return { error: 'Не вдалося видалити недоступність.' }; }
}
