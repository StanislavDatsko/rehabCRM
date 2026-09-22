import 'reflect-metadata';
import { PERMISSIONS } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { REQUIRED_PERMISSIONS_KEY } from '../common/auth/require-permissions.decorator';
import { AnatomyController } from './anatomy.controller';

const required = (handler: keyof AnatomyController): string[] | undefined =>
  Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AnatomyController.prototype[handler]);

describe('AnatomyController point annotation permissions', () => {
  it.each([
    ['list', PERMISSIONS.BODY_ANNOTATION_READ],
    ['create', PERMISSIONS.BODY_ANNOTATION_CREATE],
    ['update', PERMISSIONS.BODY_ANNOTATION_UPDATE],
    ['void', PERMISSIONS.BODY_ANNOTATION_VOID],
  ] as const)('%s denies principals without %s', (handler, permission) => {
    expect(required(handler)).toEqual([permission]);
  });

  it('keeps the patient body map behind every anatomy read permission', () => {
    expect(required('bodyMap')).toEqual([
      PERMISSIONS.ANATOMY_READ,
      PERMISSIONS.ANATOMY_MODEL_READ,
      PERMISSIONS.BODY_ANNOTATION_READ,
    ]);
  });
});
