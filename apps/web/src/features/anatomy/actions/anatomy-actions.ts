'use server';

import type { BodyAnnotationResponse, BodyAnnotationType, SurfaceAnchor } from '@repo/contracts';
import { revalidatePath } from 'next/cache';
import { ServerApiError } from '../../../lib/api/server-api-client';
import { loadCurrentUser } from '../../../lib/app/load-current-user';
import {
  createBodyAnnotation,
  transitionBodyAnnotation,
  updateBodyAnnotation,
} from '../api/anatomy-api';
import {
  POINT_ANNOTATION_VOID_REASON,
  validatePointAnnotationInput,
  type PointAnnotationInput,
} from '../point-annotations/input';
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

export type PointAnnotationResult =
  | { ok: true; annotation: BodyAnnotationResponse }
  | { ok: false; error: string };

function describeApiFailure(error: unknown, fallback: string): string {
  if (error instanceof ServerApiError) {
    if (error.status === 409) return 'Нотатку вже змінили в іншому вікні. Оновіть сторінку.';
    if (error.status === 403) return denied.error!;
    if (error.status === 404) return 'Пацієнта або структуру не знайдено.';
    if (error.status === 400) return 'Сервер відхилив точку. Оберіть ділянку ще раз.';
  }
  return fallback;
}

/**
 * Saves a free-text point note as an OTHER body annotation on the shared anchor model.
 * The organization always comes from the authenticated session, never from the browser.
 */
export async function createPointAnnotationAction(
  input: PointAnnotationInput,
): Promise<PointAnnotationResult> {
  const me = await user();
  if (me === 'unauthenticated' || me === 'denied' || !canCreateBodyAnnotation(me))
    return { ok: false, error: denied.error! };
  const valid = validatePointAnnotationInput(input);
  if (!valid.ok) return valid;
  try {
    const annotation = await createBodyAnnotation(valid.value.patientId, {
      encounterId: valid.value.encounterId,
      structureId: valid.value.structureId,
      modelVersionId: valid.value.modelVersionId,
      mappingId: valid.value.mappingId,
      type: 'OTHER',
      severity: null,
      colorHex: null,
      title: null,
      note: valid.value.comment,
      anchor: valid.value.anchor,
    });
    revalidatePath(`/app/patients/${valid.value.patientId}/body-map`);
    revalidatePath(`/app/patients/${valid.value.patientId}`);
    return { ok: true, annotation };
  } catch (error) {
    return {
      ok: false,
      error: describeApiFailure(error, 'Не вдалося зберегти нотатку. Спробуйте ще раз.'),
    };
  }
}

export async function voidPointAnnotationAction(input: {
  patientId: string;
  annotationId: string;
  version: number;
}): Promise<PointAnnotationResult> {
  const me = await user();
  if (me === 'unauthenticated' || me === 'denied' || !canVoidBodyAnnotation(me))
    return { ok: false, error: denied.error! };
  try {
    const annotation = await transitionBodyAnnotation(
      input.annotationId,
      'void',
      input.version,
      POINT_ANNOTATION_VOID_REASON,
    );
    revalidatePath(`/app/patients/${input.patientId}/body-map`);
    return { ok: true, annotation };
  } catch (error) {
    return {
      ok: false,
      error: describeApiFailure(error, 'Не вдалося видалити нотатку. Спробуйте ще раз.'),
    };
  }
}
