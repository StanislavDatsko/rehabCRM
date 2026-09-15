'use server';
import { revalidatePath } from 'next/cache';
import { serverApiFetch } from '../../lib/api/server-api-client';
export async function acknowledgeAlert(formData: FormData) { const id = String(formData.get('id')); const version = Number(formData.get('version')); await serverApiFetch(`/api/v1/clinical-alerts/${id}/acknowledge`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version }) }); revalidatePath('/app/alerts'); }
export async function resolveAlert(formData: FormData) { const id = String(formData.get('id')); const version = Number(formData.get('version')); await serverApiFetch(`/api/v1/clinical-alerts/${id}/resolve`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version }) }); revalidatePath('/app/alerts'); }
