import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';

export function canReadPatients(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.PATIENT_READ_ADMIN);
}

export function canCreatePatient(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.PATIENT_CREATE);
}

export function canUpdatePatient(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.PATIENT_UPDATE_ADMIN);
}

export function canChangePatientStatus(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.PATIENT_CHANGE_STATUS);
}
