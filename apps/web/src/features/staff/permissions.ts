import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';

export const canReadStaff = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.STAFF_READ);
export const canCreateStaff = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.STAFF_CREATE);
export const canUpdateStaff = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.STAFF_UPDATE);
export const canChangeStaffRole = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.STAFF_CHANGE_ROLE);
export const canDisableStaff = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.STAFF_DISABLE);
export const canEnableStaff = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.STAFF_ENABLE);
export const canRevokeStaffSessions = (user: CurrentUserResponse) =>
  hasPermission(user.permissions, PERMISSIONS.STAFF_SESSION_REVOKE);
