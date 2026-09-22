'use server';

import type { BodyAnnotationType, SurfaceAnchor } from '@repo/contracts';
import { revalidatePath } from 'next/cache';
import { loadCurrentUser } from '../../../lib/app/load-current-user';
import {
  createBodyAnnotation,
  transitionBodyAnnotation,
  updateBodyAnnotation,
} from '../api/anatomy-api';
import {
  canCreateBodyAnnotation,
  canResolveBodyAnnotation,
  canUpdateBodyAnnotation,
  canVoidBodyAnnotation,
} from '../permissions';

export type AnatomyActionState = { error: string | null; ok: boolean };
const denied: AnatomyActionState = {
  error: 'You do not have permission for this action.',
  ok: false,
};
const text = (data: FormData, key: string) =>
  typeof data.get(key) === 'string' ? String(data.get(key)).trim() : '';
const nullable = (data: FormData, key: string) => text(data, key) || null;

async function user() {
  return loadCurrentUser();
}

export async function createBodyAnnotationAction(
  _state: AnatomyActionState,
  data: FormData,
): Promise<AnatomyActionState> {
  const me = await user();
  if (me === 'unauthenticated' || me === 'denied' || !canCreateBodyAnnotation(me)) return denied;
  const patientId = text(data, 'patientId');
  try {
    const anchor = JSON.parse(text(data, 'anchor')) as SurfaceAnchor;
    await createBodyAnnotation(patientId, {
      encounterId: nullable(data, 'encounterId'),
      structureId: text(data, 'structureId'),
      modelVersionId: text(data, 'modelVersionId'),
      mappingId: text(data, 'mappingId'),
      type: text(data, 'type') as BodyAnnotationType,
      severity: nullable(data, 'severity') === null ? null : Number(text(data, 'severity')),
      colorHex: nullable(data, 'colorHex'),
      title: nullable(data, 'title'),
      note: nullable(data, 'note'),
      anchor,
    });
    revalidatePath(`/app/patients/${patientId}/body-map`);
    revalidatePath(`/app/patients/${patientId}`);
    return { error: null, ok: true };
  } catch {
    return {
      error: 'The annotation could not be saved. Review the selected surface and fields.',
      ok: false,
    };
  }
}

export async function updateBodyAnnotationAction(
  _state: AnatomyActionState,
  data: FormData,
): Promise<AnatomyActionState> {
  const me = await user();
  if (me === 'unauthenticated' || me === 'denied' || !canUpdateBodyAnnotation(me)) return denied;
  try {
    await updateBodyAnnotation(text(data, 'annotationId'), {
      version: Number(text(data, 'version')),
      type: text(data, 'type') as BodyAnnotationType,
      severity: nullable(data, 'severity') === null ? null : Number(text(data, 'severity')),
      colorHex: nullable(data, 'colorHex'),
      title: nullable(data, 'title'),
      note: nullable(data, 'note'),
    });
    revalidatePath(`/app/patients/${text(data, 'patientId')}/body-map`);
    return { error: null, ok: true };
  } catch {
    return {
      error: 'The annotation changed or could not be updated. Refresh and retry.',
      ok: false,
    };
  }
}

export async function transitionBodyAnnotationAction(
  _state: AnatomyActionState,
  data: FormData,
): Promise<AnatomyActionState> {
  const me = await user();
  const action = text(data, 'action') as 'resolve' | 'void';
  const allowed =
    me !== 'unauthenticated' &&
    me !== 'denied' &&
    (action === 'resolve' ? canResolveBodyAnnotation(me) : canVoidBodyAnnotation(me));
  if (!allowed) return denied;
  try {
    await transitionBodyAnnotation(
      text(data, 'annotationId'),
      action,
      Number(text(data, 'version')),
      nullable(data, 'reason'),
    );
    revalidatePath(`/app/patients/${text(data, 'patientId')}/body-map`);
    return { error: null, ok: true };
  } catch {
    return { error: 'The status could not be changed. Refresh and retry.', ok: false };
  }
}
