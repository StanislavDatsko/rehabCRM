'use server';
import { revalidatePath } from 'next/cache';
import { serverApiFetch } from '../../lib/api/server-api-client';
export async function markNotificationRead(formData: FormData) { const id = String(formData.get('id')); await serverApiFetch(`/api/v1/patient-portal/notifications/${id}/read`, { method: 'PATCH' }); revalidatePath('/patient/notifications'); }
export async function dismissNotification(formData: FormData) { const id = String(formData.get('id')); await serverApiFetch(`/api/v1/patient-portal/notifications/${id}/dismiss`, { method: 'PATCH' }); revalidatePath('/patient/notifications'); }
