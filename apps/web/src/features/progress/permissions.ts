import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';

export const canReadProgress = (user: CurrentUserResponse) => hasPermission(user.permissions, PERMISSIONS.PROGRESS_READ);
export const canReadClinicalTimeline = (user: CurrentUserResponse) => hasPermission(user.permissions, PERMISSIONS.CLINICAL_TIMELINE_READ);
export const canReadClinicalReports = (user: CurrentUserResponse) => hasPermission(user.permissions, PERMISSIONS.CLINICAL_REPORT_READ);
export const canCreateClinicalReport = (user: CurrentUserResponse) => hasPermission(user.permissions, PERMISSIONS.CLINICAL_REPORT_CREATE);
export const canVoidClinicalReport = (user: CurrentUserResponse) => hasPermission(user.permissions, PERMISSIONS.CLINICAL_REPORT_VOID);
