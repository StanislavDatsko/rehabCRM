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
  PAIN: 'Pain',
  MOBILITY_LIMITATION: 'Mobility limitation',
  WEAKNESS: 'Weakness',
  TENSION: 'Tension',
  INFLAMMATION: 'Inflammation',
  POST_SURGERY: 'Post-surgery observation',
  INJURY: 'Injury',
  SENSITIVITY: 'Sensitivity',
  OTHER: 'Other',
};

export const ANATOMY_LAYER_LABELS: Record<string, string> = {
  MUSCULAR: "М'язи",
  SKELETAL: 'Кістки',
  JOINTS: 'Суглоби',
};
