import type { BodyAnnotationType } from '@repo/contracts';

export const BODY_ANNOTATION_TYPES: BodyAnnotationType[] = [
  'PAIN',
  'MOBILITY_LIMITATION',
  'WEAKNESS',
  'TENSION',
  'INFLAMMATION',
  'POST_SURGERY',
  'INJURY',
  'SENSITIVITY',
  'OTHER',
];

export const BODY_ANNOTATION_TYPE_LABELS: Record<BodyAnnotationType, string> = {
  PAIN: 'Біль',
  MOBILITY_LIMITATION: 'Обмеження рухливості',
  WEAKNESS: 'Слабкість',
  TENSION: 'Напруження',
  INFLAMMATION: 'Запалення',
  POST_SURGERY: 'Післяопераційне спостереження',
  INJURY: 'Травма',
  SENSITIVITY: 'Чутливість',
  OTHER: 'Інше',
};

export const ANATOMY_LAYER_LABELS: Record<string, string> = {
  MUSCULAR: "М'язи",
  SKELETAL: 'Кістки',
  JOINTS: 'Суглоби',
};

export const BODY_ANNOTATION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активна',
  RESOLVED: 'Вирішена',
  VOIDED: 'Скасована',
  CREATED: 'Створена',
};
export const annotationStatusLabel = (status: string): string => BODY_ANNOTATION_STATUS_LABELS[status] ?? status;
