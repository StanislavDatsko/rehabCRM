import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';

export const canReadBodyMap = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.ANATOMY_READ) &&
  hasPermission(user.permissions, PERMISSIONS.ANATOMY_MODEL_READ) &&
  hasPermission(user.permissions, PERMISSIONS.BODY_ANNOTATION_READ);
export const canCreateBodyAnnotation = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.BODY_ANNOTATION_CREATE);
export const canUpdateBodyAnnotation = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.BODY_ANNOTATION_UPDATE);
export const canResolveBodyAnnotation = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.BODY_ANNOTATION_RESOLVE);
export const canVoidBodyAnnotation = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.BODY_ANNOTATION_VOID);
