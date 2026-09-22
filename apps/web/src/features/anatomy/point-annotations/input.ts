import { BODY_ANNOTATION_NOTE_MAX_LENGTH, type SurfaceAnchor } from '@repo/contracts';

/** Reason recorded in the immutable status history when a point note is removed from the map. */
export const POINT_ANNOTATION_VOID_REASON = 'Точкову нотатку видалено з body map';

export type PointAnnotationInput = {
  patientId: string;
  encounterId?: string | null;
  structureId: string;
  modelVersionId: string;
  mappingId: string;
  anchor: SurfaceAnchor;
  comment: string;
};

export type ValidPointAnnotationInput = PointAnnotationInput & { comment: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isVec3 = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) && value.length === 3 && value.every((item) => Number.isFinite(item));

/**
 * Client-side gate shared by the composer and the server action. The API re-validates with Zod;
 * this keeps obviously broken drafts (empty comment, NaN anchors) from ever leaving the browser.
 */
export function validatePointAnnotationInput(
  input: PointAnnotationInput,
): { ok: true; value: ValidPointAnnotationInput } | { ok: false; error: string } {
  const comment = input.comment.trim();
  if (!comment) return { ok: false, error: 'Додайте коментар, щоб зберегти нотатку.' };
  if (comment.length > BODY_ANNOTATION_NOTE_MAX_LENGTH)
    return {
      ok: false,
      error: `Коментар не може перевищувати ${BODY_ANNOTATION_NOTE_MAX_LENGTH} символів.`,
    };
  for (const id of [input.patientId, input.structureId, input.modelVersionId, input.mappingId])
    if (!UUID.test(id)) return { ok: false, error: 'Точка не прив’язана до анатомічної структури.' };
  if (input.encounterId && !UUID.test(input.encounterId))
    return { ok: false, error: 'Некоректний ідентифікатор візиту.' };
  const { anchor } = input;
  if (
    !anchor.stableMeshKey.trim() ||
    !Number.isInteger(anchor.triangleIndex) ||
    anchor.triangleIndex < 0 ||
    !Number.isInteger(anchor.primitiveIndex) ||
    !isVec3(anchor.localPosition) ||
    !isVec3(anchor.barycentric) ||
    (anchor.localNormal !== null && !isVec3(anchor.localNormal))
  )
    return { ok: false, error: 'Координати точки некоректні. Спробуйте обрати ділянку ще раз.' };
  return { ok: true, value: { ...input, comment, encounterId: input.encounterId || null } };
}
