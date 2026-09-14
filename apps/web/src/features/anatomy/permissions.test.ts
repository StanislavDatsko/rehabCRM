import { PERMISSIONS, type CurrentUserResponse, type Permission } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import {
  canCreateBodyAnnotation,
  canReadBodyMap,
  canResolveBodyAnnotation,
  canUpdateBodyAnnotation,
  canVoidBodyAnnotation,
} from './permissions';

const user = (permissions: Permission[]): CurrentUserResponse => ({
  id: 'user',
  email: 'user@example.invalid',
  displayName: 'User',
  organization: { id: 'org', name: 'Clinic' },
  role: 'REHABILITATION_SPECIALIST',
  permissions,
});

describe('body-map permission visibility', () => {
  it('requires every read permission before exposing the workspace', () => {
    const complete = [
      PERMISSIONS.ANATOMY_READ,
      PERMISSIONS.ANATOMY_MODEL_READ,
      PERMISSIONS.BODY_ANNOTATION_READ,
    ];
    expect(canReadBodyMap(user(complete))).toBe(true);
    expect(canReadBodyMap(user(complete.slice(0, 2)))).toBe(false);
  });

  it('hides each clinical command unless its exact permission is present', () => {
    expect(canCreateBodyAnnotation(user([PERMISSIONS.BODY_ANNOTATION_CREATE]))).toBe(true);
    expect(canUpdateBodyAnnotation(user([]))).toBe(false);
    expect(canResolveBodyAnnotation(user([PERMISSIONS.BODY_ANNOTATION_RESOLVE]))).toBe(true);
    expect(canVoidBodyAnnotation(user([PERMISSIONS.BODY_ANNOTATION_RESOLVE]))).toBe(false);
  });
});
