'use server';

import type {
  AnatomicalRegionCode,
  Laterality,
  MeasurementValueType,
  UnitCode,
} from '@repo/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ServerApiError } from '../../../lib/api/server-api-client';
import { loadCurrentUser } from '../../../lib/app/load-current-user';
import {
  completeAssessment,
  createAssessment,
  updateAssessment,
  voidAssessment,
  type MeasurementInput,
} from '../api/assessments-api';
import {
  canCompleteAssessment,
  canCreateAssessment,
  canUpdateAssessment,
  canVoidAssessment,
} from '../permissions';

function textValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function errorCode(error: unknown): string {
  return error instanceof ServerApiError ? (error.body?.code ?? 'UNKNOWN') : 'UNKNOWN';
}

async function currentUser() {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') redirect('/login?reason=expired');
  return me;
}

export async function createAssessmentAction(formData: FormData): Promise<void> {
  const me = await currentUser();
  const patientId = textValue(formData, 'patientId') ?? '';
  const encounterId = textValue(formData, 'encounterId');
  if (me === 'denied' || !canCreateAssessment(me))
    redirect(`/app/patients/${patientId}?assessmentError=FORBIDDEN`);
  let createdId: string;
  try {
    const created = await createAssessment(patientId, {
      encounterId,
      templateId: textValue(formData, 'templateId'),
      title: textValue(formData, 'title') ?? undefined,
      performedAt: textValue(formData, 'performedAt')
        ? new Date(textValue(formData, 'performedAt') as string).toISOString()
        : undefined,
    });
    createdId = created.id;
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 401) redirect('/login?reason=expired');
    redirect(
      `/app/patients/${patientId}/assessments/new?error=${encodeURIComponent(errorCode(error))}${encounterId ? `&encounterId=${encounterId}` : ''}`,
    );
  }
  revalidatePath(`/app/patients/${patientId}`);
  if (encounterId) revalidatePath(`/app/encounters/${encounterId}`);
  redirect(`/app/assessments/${createdId}?created=1`);
}

function measurementInputs(formData: FormData): MeasurementInput[] {
  const result: MeasurementInput[] = [];
  for (const [key, rawDefinitionId] of formData.entries()) {
    if (!key.startsWith('definition.') || typeof rawDefinitionId !== 'string') continue;
    const itemId = key.slice('definition.'.length);
    const raw = textValue(formData, `value.${itemId}`);
    if (raw === null) continue;
    const valueType = textValue(formData, `valueType.${itemId}`) as MeasurementValueType;
    let value: string | number | boolean = raw;
    if (valueType === 'NUMBER' || valueType === 'INTEGER' || valueType === 'SCALE')
      value = Number(raw);
    if (valueType === 'BOOLEAN') value = raw === 'true';
    result.push({
      definitionId: rawDefinitionId,
      templateItemId: itemId,
      anatomicalRegion: textValue(formData, `region.${itemId}`) as AnatomicalRegionCode | null,
      laterality: textValue(formData, `laterality.${itemId}`) as Laterality | null,
      sequenceNumber: 1,
      value,
      unit: textValue(formData, `unit.${itemId}`) as UnitCode | null,
      note: textValue(formData, `note.${itemId}`),
    });
  }
  return result;
}

export async function saveAssessmentAction(formData: FormData): Promise<void> {
  const me = await currentUser();
  const id = textValue(formData, 'assessmentId') ?? '';
  if (me === 'denied' || !canUpdateAssessment(me))
    redirect(`/app/assessments/${id}?error=FORBIDDEN`);
  try {
    await updateAssessment(id, {
      version: Number(textValue(formData, 'version')),
      title: textValue(formData, 'title') ?? undefined,
      performedAt: new Date(textValue(formData, 'performedAt') ?? '').toISOString(),
      summary: textValue(formData, 'summary'),
      measurements: measurementInputs(formData),
    });
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 401) redirect('/login?reason=expired');
    redirect(`/app/assessments/${id}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidatePath(`/app/assessments/${id}`);
  redirect(`/app/assessments/${id}?saved=1`);
}

export async function completeAssessmentAction(formData: FormData): Promise<void> {
  const me = await currentUser();
  const id = textValue(formData, 'assessmentId') ?? '';
  if (me === 'denied' || !canCompleteAssessment(me))
    redirect(`/app/assessments/${id}?error=FORBIDDEN`);
  let completedPatientId: string;
  let completedEncounterId: string | null;
  try {
    const completed = await completeAssessment(id, Number(textValue(formData, 'version')));
    completedPatientId = completed.patient.id;
    completedEncounterId = completed.encounter?.id ?? null;
  } catch (error) {
    redirect(`/app/assessments/${id}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidatePath(`/app/patients/${completedPatientId}`);
  if (completedEncounterId) revalidatePath(`/app/encounters/${completedEncounterId}`);
  redirect(`/app/assessments/${id}?completed=1`);
}

export async function voidAssessmentAction(formData: FormData): Promise<void> {
  const me = await currentUser();
  const id = textValue(formData, 'assessmentId') ?? '';
  if (me === 'denied' || !canVoidAssessment(me)) redirect(`/app/assessments/${id}?error=FORBIDDEN`);
  let patientId: string;
  try {
    const voided = await voidAssessment(
      id,
      Number(textValue(formData, 'version')),
      textValue(formData, 'reason') ?? '',
    );
    patientId = voided.patient.id;
  } catch (error) {
    redirect(`/app/assessments/${id}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidatePath(`/app/patients/${patientId}`);
  redirect(`/app/assessments/${id}?voided=1`);
}
