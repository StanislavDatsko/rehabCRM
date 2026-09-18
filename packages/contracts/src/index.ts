export const API_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
  STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
  STAFF_EMAIL_CONFLICT: 'STAFF_EMAIL_CONFLICT',
  STAFF_ROLE_NOT_ASSIGNABLE: 'STAFF_ROLE_NOT_ASSIGNABLE',
  STAFF_LAST_ADMIN_REQUIRED: 'STAFF_LAST_ADMIN_REQUIRED',
  STAFF_SELF_DISABLE_FORBIDDEN: 'STAFF_SELF_DISABLE_FORBIDDEN',
  STAFF_UPDATE_CONFLICT: 'STAFF_UPDATE_CONFLICT',
  STAFF_PROVISIONING_FAILED: 'STAFF_PROVISIONING_FAILED',
  STAFF_IDENTITY_UNAVAILABLE: 'STAFF_IDENTITY_UNAVAILABLE',
  PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
  PATIENT_UPDATE_CONFLICT: 'PATIENT_UPDATE_CONFLICT',
  RESPONSIBLE_PRACTITIONER_NOT_FOUND: 'RESPONSIBLE_PRACTITIONER_NOT_FOUND',
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  APPOINTMENT_TIME_CONFLICT: 'APPOINTMENT_TIME_CONFLICT',
  APPOINTMENT_INVALID_TRANSITION: 'APPOINTMENT_INVALID_TRANSITION',
  APPOINTMENT_UPDATE_CONFLICT: 'APPOINTMENT_UPDATE_CONFLICT',
  PATIENT_NOT_SCHEDULABLE: 'PATIENT_NOT_SCHEDULABLE',
  PRACTITIONER_NOT_AVAILABLE: 'PRACTITIONER_NOT_AVAILABLE',
  PRACTITIONER_NOT_FOUND: 'PRACTITIONER_NOT_FOUND',
  ENCOUNTER_ALREADY_EXISTS: 'ENCOUNTER_ALREADY_EXISTS',
  ENCOUNTER_NOT_FOUND: 'ENCOUNTER_NOT_FOUND',
  ENCOUNTER_INVALID_TRANSITION: 'ENCOUNTER_INVALID_TRANSITION',
  ASSESSMENT_NOT_FOUND: 'ASSESSMENT_NOT_FOUND',
  ASSESSMENT_UPDATE_CONFLICT: 'ASSESSMENT_UPDATE_CONFLICT',
  ASSESSMENT_NOT_EDITABLE: 'ASSESSMENT_NOT_EDITABLE',
  ASSESSMENT_ALREADY_COMPLETED: 'ASSESSMENT_ALREADY_COMPLETED',
  ASSESSMENT_REQUIRED_MEASUREMENTS_MISSING: 'ASSESSMENT_REQUIRED_MEASUREMENTS_MISSING',
  ASSESSMENT_INVALID_TRANSITION: 'ASSESSMENT_INVALID_TRANSITION',
  ASSESSMENT_ENCOUNTER_MISMATCH: 'ASSESSMENT_ENCOUNTER_MISMATCH',
  ASSESSMENT_TEMPLATE_NOT_FOUND: 'ASSESSMENT_TEMPLATE_NOT_FOUND',
  MEASUREMENT_DEFINITION_NOT_FOUND: 'MEASUREMENT_DEFINITION_NOT_FOUND',
  MEASUREMENT_INVALID_VALUE: 'MEASUREMENT_INVALID_VALUE',
  MEASUREMENT_UNIT_MISMATCH: 'MEASUREMENT_UNIT_MISMATCH',
  PRACTITIONER_REQUIRED: 'PRACTITIONER_REQUIRED',
  REHABILITATION_PLAN_NOT_FOUND: 'REHABILITATION_PLAN_NOT_FOUND',
  REHABILITATION_PLAN_UPDATE_CONFLICT: 'REHABILITATION_PLAN_UPDATE_CONFLICT',
  REHABILITATION_PLAN_INVALID_TRANSITION: 'REHABILITATION_PLAN_INVALID_TRANSITION',
  REHABILITATION_PLAN_NOT_EDITABLE: 'REHABILITATION_PLAN_NOT_EDITABLE',
  REHABILITATION_PLAN_INCOMPLETE: 'REHABILITATION_PLAN_INCOMPLETE',
  REHABILITATION_PLAN_DRAFT_EXISTS: 'REHABILITATION_PLAN_DRAFT_EXISTS',
  REHABILITATION_GOAL_INVALID_TARGET: 'REHABILITATION_GOAL_INVALID_TARGET',
  REHABILITATION_GOAL_MEASUREMENT_MISMATCH: 'REHABILITATION_GOAL_MEASUREMENT_MISMATCH',
  EXERCISE_NOT_FOUND: 'EXERCISE_NOT_FOUND',
  EXERCISE_NOT_AVAILABLE: 'EXERCISE_NOT_AVAILABLE',
  EXERCISE_PRESCRIPTION_INVALID_DOSAGE: 'EXERCISE_PRESCRIPTION_INVALID_DOSAGE',
  ANATOMICAL_MODEL_NOT_FOUND: 'ANATOMICAL_MODEL_NOT_FOUND',
  ANATOMICAL_MODEL_VERSION_NOT_FOUND: 'ANATOMICAL_MODEL_VERSION_NOT_FOUND',
  ANATOMICAL_STRUCTURE_NOT_FOUND: 'ANATOMICAL_STRUCTURE_NOT_FOUND',
  ANATOMICAL_STRUCTURE_NOT_MAPPED: 'ANATOMICAL_STRUCTURE_NOT_MAPPED',
  BODY_ANNOTATION_NOT_FOUND: 'BODY_ANNOTATION_NOT_FOUND',
  BODY_ANNOTATION_UPDATE_CONFLICT: 'BODY_ANNOTATION_UPDATE_CONFLICT',
  BODY_ANNOTATION_INVALID_TRANSITION: 'BODY_ANNOTATION_INVALID_TRANSITION',
  BODY_ANNOTATION_INVALID_ANCHOR: 'BODY_ANNOTATION_INVALID_ANCHOR',
  BODY_ANNOTATION_PATIENT_ENCOUNTER_MISMATCH: 'BODY_ANNOTATION_PATIENT_ENCOUNTER_MISMATCH',
  PROGRESS_NOT_FOUND: 'PROGRESS_NOT_FOUND',
  PROGRESS_INVALID_DATE_RANGE: 'PROGRESS_INVALID_DATE_RANGE',
  CLINICAL_TIMELINE_INVALID_FILTER: 'CLINICAL_TIMELINE_INVALID_FILTER',
  CLINICAL_REPORT_NOT_FOUND: 'CLINICAL_REPORT_NOT_FOUND',
  CLINICAL_REPORT_GENERATION_FAILED: 'CLINICAL_REPORT_GENERATION_FAILED',
  CLINICAL_REPORT_NOT_READY: 'CLINICAL_REPORT_NOT_READY',
  CLINICAL_REPORT_ALREADY_VOIDED: 'CLINICAL_REPORT_ALREADY_VOIDED',
  CLINICAL_REPORT_INVALID_PERIOD: 'CLINICAL_REPORT_INVALID_PERIOD',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export type ApiErrorBody = {
  code: ApiErrorCode | string;
  message: string;
  requestId: string;
  details?: unknown;
  fields?: Record<string, string>;
};

export type PaginationQuery = {
  page: number;
  pageSize: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type HealthStatus = 'ok' | 'degraded' | 'down';

export type HealthLiveResponse = {
  status: HealthStatus;
  service: 'rehabcrm-api';
};

export type HealthReadyResponse = {
  status: HealthStatus;
  service: 'rehabcrm-api';
  checks: {
    database: HealthStatus;
    redis: HealthStatus;
    identityProvider: HealthStatus;
    objectStorage: HealthStatus;
  };
};

export type HealthInfoResponse = {
  service: 'rehabcrm-api';
  version: string;
  commitSha: string;
  schemaVersion: string;
  deploymentEnvironment: 'development' | 'test' | 'staging' | 'production';
};

export function defaultPagination(page = 1, pageSize = 20): PaginationQuery {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 20;
  return { page: safePage, pageSize: safeSize };
}

export {
  STAFF_ROLES,
  PERMISSIONS,
  hasPermission,
  type StaffRole,
  type Permission,
  type CurrentUserResponse,
  PATIENT_STATUSES,
  PATIENT_SEX_VALUES,
  type PatientStatus,
  type PatientSex,
  type ResponsiblePractitionerResponse,
  type PatientAdministrativeResponse,
  type PatientListResponse,
  type PatientHistoryItem,
} from './permissions';
export {
  ASSIGNABLE_STAFF_ROLES,
  STAFF_SETUP_STATUSES,
  type AssignableStaffRole,
  type StaffSetupStatus,
  type StaffMembershipStatus,
  type StaffResponse,
  type StaffListResponse,
  type StaffHistoryAction,
  type StaffHistoryItem,
} from './staff';
export {
  ANATOMICAL_STRUCTURE_CATEGORIES,
  ANATOMICAL_MODEL_KINDS,
  BODY_ANNOTATION_TYPES,
  BODY_ANNOTATION_STATUSES,
  type AnatomicalStructureCategory,
  type AnatomicalModelKind,
  type AnatomicalStructureResponse,
  type AnatomicalMappingResponse,
  type AnatomicalModelVersionResponse,
  type AnatomicalModelResponse,
  type SurfaceAnchor,
  type BodyAnnotationType,
  type BodyAnnotationStatus,
  type BodyAnnotationHistoryItem,
  type BodyAnnotationResponse,
  type BodyMapClinicalContext,
  type PatientBodyMapResponse,
} from './anatomy';
export {
  APPOINTMENT_STATUSES,
  ENCOUNTER_STATUSES,
  CALENDAR_MAX_RANGE_DAYS,
  APPOINTMENT_MIN_DURATION_MINUTES,
  APPOINTMENT_MAX_DURATION_MINUTES,
  type AppointmentStatus,
  type EncounterStatus,
  type SchedulingPersonRef,
  type SchedulingLocationRef,
  type SchedulingRoomRef,
  type AppointmentTypeRef,
  type AppointmentCalendarItem,
  type AppointmentDetailResponse,
  type AppointmentCalendarResponse,
  type PatientAppointmentSummary,
  type EncounterResponse,
  type SchedulingCatalogResponse,
} from './scheduling';
export {
  ASSESSMENT_STATUSES,
  MEASUREMENT_VALUE_TYPES,
  MEASUREMENT_CATEGORIES,
  LATERALITIES,
  ANATOMICAL_REGION_CODES,
  UNIT_CODES,
  type AssessmentStatus,
  type MeasurementValueType,
  type MeasurementCategory,
  type Laterality,
  type AnatomicalRegionCode,
  type UnitCode,
  type MeasurementDefinitionResponse,
  type AssessmentTemplateItemResponse,
  type AssessmentTemplateResponse,
  type MeasurementValue,
  type MeasurementResponse,
  type AssessmentResponse,
  type AssessmentListItem,
  type MeasurementHistoryPoint,
} from './assessments';
export {
  REHABILITATION_PLAN_STATUSES,
  REHABILITATION_GOAL_STATUSES,
  GOAL_TARGET_OPERATORS,
  EXERCISE_CATEGORIES,
  EXERCISE_DOSAGE_KINDS,
  EXERCISE_FREQUENCY_TYPES,
  type RehabilitationPlanStatus,
  type RehabilitationGoalStatus,
  type GoalTargetOperator,
  type ExerciseCategory,
  type ExerciseDosageKind,
  type ExerciseFrequencyType,
  type ExerciseMediaResponse,
  type ExerciseLibraryItem,
  type ExerciseDetailResponse,
  type ExerciseLibraryResponse,
  type GoalProgressValue,
  type RehabilitationGoalResponse,
  type RehabilitationPlanPhaseResponse,
  type ExercisePrescriptionResponse,
  type RehabilitationPlanRevisionResponse,
  type RehabilitationPlanResponse,
  type RehabilitationPlanListItem,
} from './rehabilitation';
export {
  PROGRESS_PERIODS,
  CLINICAL_TIMELINE_CATEGORIES,
  CLINICAL_REPORT_SECTIONS,
  type ProgressPeriod,
  type ProgressPeriodResponse,
  type ClinicalTimelineCategory,
  type ClinicalTimelineItem,
  type ClinicalTimelineResponse,
  type MeasurementTrendPoint,
  type MeasurementTrendSeries,
  type MeasurementTrendsResponse,
  type GoalProgressItem,
  type GoalProgressResponse,
  type PlanRevisionDiff,
  type PlanHistoryItem,
  type BodyAnnotationProgressGroup,
  type BodyAnnotationProgressResponse,
  type ProgressSummaryResponse,
  type ClinicalReportSection,
  type ClinicalReportStatus,
  type ClinicalReportResponse,
  type ClinicalReportListResponse,
  type ClinicalReportDownloadResponse,
} from './progress';
