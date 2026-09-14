import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';

export const canReadAssessments = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.ASSESSMENT_READ) &&
  hasPermission(user.permissions, PERMISSIONS.MEASUREMENT_READ);
export const canCreateAssessment = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.ASSESSMENT_CREATE);
export const canUpdateAssessment = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.ASSESSMENT_UPDATE) &&
  hasPermission(user.permissions, PERMISSIONS.MEASUREMENT_WRITE);
export const canCompleteAssessment = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.ASSESSMENT_COMPLETE);
export const canVoidAssessment = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.ASSESSMENT_VOID);
