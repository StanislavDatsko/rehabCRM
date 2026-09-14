import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';

export const canReadPlans = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.REHABILITATION_PLAN_READ) &&
  hasPermission(user.permissions, PERMISSIONS.REHABILITATION_GOAL_READ) &&
  hasPermission(user.permissions, PERMISSIONS.EXERCISE_PRESCRIPTION_READ);
export const canCreatePlan = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.REHABILITATION_PLAN_CREATE);
export const canEditPlan = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.REHABILITATION_PLAN_UPDATE) &&
  hasPermission(user.permissions, PERMISSIONS.REHABILITATION_GOAL_WRITE) &&
  hasPermission(user.permissions, PERMISSIONS.EXERCISE_PRESCRIPTION_WRITE);
export const canActivatePlan = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.REHABILITATION_PLAN_ACTIVATE);
export const canPausePlan = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.REHABILITATION_PLAN_PAUSE);
export const canCompletePlan = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.REHABILITATION_PLAN_COMPLETE);
export const canCancelPlan = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.REHABILITATION_PLAN_CANCEL);
export const canReadExercises = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.EXERCISE_READ);
