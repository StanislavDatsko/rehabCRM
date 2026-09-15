export const STAFF_ROLES = [
  'SYSTEM_ADMIN',
  'ORGANIZATION_ADMIN',
  'RECEPTIONIST',
  'REHABILITATION_SPECIALIST',
  'PATIENT',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * Application permissions. Resource.action with snake_case resources.
 * UI copy may differ; these strings are the API contract.
 */
export const PERMISSIONS = {
  ORGANIZATION_READ: 'organization.read',
  ORGANIZATION_MANAGE: 'organization.manage',
  STAFF_READ: 'staff.read',
  STAFF_MANAGE: 'staff.manage',
  STAFF_CREATE: 'staff.create',
  STAFF_UPDATE: 'staff.update',
  STAFF_CHANGE_ROLE: 'staff.change_role',
  STAFF_DISABLE: 'staff.disable',
  STAFF_ENABLE: 'staff.enable',
  STAFF_SESSION_REVOKE: 'staff.session_revoke',
  PATIENT_READ_ADMIN: 'patient.read.admin',
  PATIENT_CREATE: 'patient.create',
  PATIENT_UPDATE_ADMIN: 'patient.update.admin',
  PATIENT_CHANGE_STATUS: 'patient.change_status',
  PATIENT_READ_CLINICAL: 'patient.read.clinical',
  APPOINTMENT_READ: 'appointment.read',
  APPOINTMENT_CREATE: 'appointment.create',
  APPOINTMENT_UPDATE: 'appointment.update',
  APPOINTMENT_CANCEL: 'appointment.cancel',
  APPOINTMENT_CHANGE_STATUS: 'appointment.change_status',
  ENCOUNTER_READ: 'encounter.read',
  ENCOUNTER_START: 'encounter.start',
  ENCOUNTER_COMPLETE: 'encounter.complete',
  ENCOUNTER_WRITE: 'encounter.write',
  CLINICAL_NOTE_READ: 'clinical_note.read',
  CLINICAL_NOTE_WRITE: 'clinical_note.write',
  REHABILITATION_PLAN_READ: 'rehabilitation_plan.read',
  REHABILITATION_PLAN_CREATE: 'rehabilitation_plan.create',
  REHABILITATION_PLAN_UPDATE: 'rehabilitation_plan.update',
  REHABILITATION_PLAN_ACTIVATE: 'rehabilitation_plan.activate',
  REHABILITATION_PLAN_PAUSE: 'rehabilitation_plan.pause',
  REHABILITATION_PLAN_COMPLETE: 'rehabilitation_plan.complete',
  REHABILITATION_PLAN_CANCEL: 'rehabilitation_plan.cancel',
  REHABILITATION_GOAL_READ: 'rehabilitation_goal.read',
  REHABILITATION_GOAL_WRITE: 'rehabilitation_goal.write',
  EXERCISE_READ: 'exercise.read',
  EXERCISE_MANAGE: 'exercise.manage',
  EXERCISE_PRESCRIPTION_READ: 'exercise_prescription.read',
  EXERCISE_PRESCRIPTION_WRITE: 'exercise_prescription.write',
  ASSESSMENT_READ: 'assessment.read',
  ASSESSMENT_CREATE: 'assessment.create',
  ASSESSMENT_UPDATE: 'assessment.update',
  ASSESSMENT_COMPLETE: 'assessment.complete',
  ASSESSMENT_VOID: 'assessment.void',
  MEASUREMENT_READ: 'measurement.read',
  MEASUREMENT_WRITE: 'measurement.write',
  ASSESSMENT_TEMPLATE_READ: 'assessment_template.read',
  ANATOMY_READ: 'anatomy.read',
  ANATOMY_MODEL_READ: 'anatomy_model.read',
  ANATOMY_MODEL_MANAGE: 'anatomy_model.manage',
  BODY_ANNOTATION_READ: 'body_annotation.read',
  BODY_ANNOTATION_CREATE: 'body_annotation.create',
  BODY_ANNOTATION_UPDATE: 'body_annotation.update',
  BODY_ANNOTATION_RESOLVE: 'body_annotation.resolve',
  BODY_ANNOTATION_VOID: 'body_annotation.void',
  PROGRESS_READ: 'progress.read',
  CLINICAL_TIMELINE_READ: 'clinical_timeline.read',
  CLINICAL_REPORT_READ: 'clinical_report.read',
  CLINICAL_REPORT_CREATE: 'clinical_report.create',
  CLINICAL_REPORT_VOID: 'clinical_report.void',
  DOCUMENT_READ_ADMIN: 'document.read.admin',
  DOCUMENT_READ_CLINICAL: 'document.read.clinical',
  DOCUMENT_WRITE: 'document.write',
  AUDIT_READ: 'audit.read',
  PATIENT_PORTAL_SELF_READ: 'patient_portal.self.read',
  REHABILITATION_PLAN_SELF_READ: 'rehabilitation_plan.self.read',
  PROGRESS_SELF_READ: 'progress.self.read',
  DAILY_REPORT_SELF_READ: 'daily_report.self.read',
  DAILY_REPORT_SELF_CREATE: 'daily_report.self.create',
  DAILY_REPORT_SELF_UPDATE: 'daily_report.self.update',
  PATIENT_SYMPTOM_SELF_READ: 'patient_symptom.self.read',
  PATIENT_SYMPTOM_SELF_CREATE: 'patient_symptom.self.create',
  EXERCISE_COMPLETION_SELF_READ: 'exercise_completion.self.read',
  EXERCISE_COMPLETION_SELF_CREATE: 'exercise_completion.self.create',
  EXERCISE_COMPLETION_SELF_UPDATE: 'exercise_completion.self.update',
  PATIENT_MONITORING_READ: 'patient_monitoring.read',
  NOTIFICATION_SELF_READ: 'notification.self.read',
  NOTIFICATION_SELF_UPDATE: 'notification.self.update',
  CLINICAL_ALERT_READ: 'clinical_alert.read',
  CLINICAL_ALERT_ACKNOWLEDGE: 'clinical_alert.acknowledge',
  CLINICAL_ALERT_RESOLVE: 'clinical_alert.resolve',
  PATIENT_MEDIA_READ: 'patient_media.read',
  PATIENT_MEDIA_CREATE: 'patient_media.create',
  PATIENT_MEDIA_VOID: 'patient_media.void',
  PATIENT_MEDIA_DOWNLOAD: 'patient_media.download',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type CurrentUserResponse = {
  id: string;
  email: string;
  displayName: string;
  organization: {
    id: string;
    name: string;
  };
  role: StaffRole;
  permissions: Permission[];
};

export const PATIENT_STATUSES = ['ACTIVE', 'INACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];

export const PATIENT_SEX_VALUES = ['FEMALE', 'MALE', 'OTHER', 'UNKNOWN'] as const;
export type PatientSex = (typeof PATIENT_SEX_VALUES)[number];

export type ResponsiblePractitionerResponse = {
  id: string;
  displayName: string;
  status: 'ACTIVE' | 'DISABLED';
};

export type PatientAdministrativeResponse = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  fullName: string;
  dateOfBirth: string | null;
  sex: PatientSex | null;
  phone: string | null;
  email: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string | null;
  };
  emergencyContact: {
    name: string | null;
    phone: string | null;
    relationship: string | null;
  } | null;
  responsiblePractitioner: ResponsiblePractitionerResponse | null;
  status: PatientStatus;
  internalReferenceNumber: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PatientListResponse = {
  items: PatientAdministrativeResponse[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PatientHistoryItem = {
  id: string;
  action:
    | 'PATIENT_CREATED'
    | 'PATIENT_ADMINISTRATIVE_UPDATED'
    | 'PATIENT_STATUS_CHANGED'
    | 'PATIENT_RESPONSIBLE_PRACTITIONER_CHANGED';
  occurredAt: string;
  actor: { id: string; displayName: string };
  changedFields: string[];
  statusChange?: { from: PatientStatus; to: PatientStatus };
};

export function hasPermission(granted: readonly string[], required: Permission): boolean {
  return granted.includes(required);
}
