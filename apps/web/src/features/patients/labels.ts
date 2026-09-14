import type { PatientHistoryItem, PatientSex, PatientStatus } from '@repo/contracts';
import { t, type MessageKey } from '../../i18n/messages';

const STATUS_KEYS: Record<PatientStatus, MessageKey> = {
  ACTIVE: 'patientStatusActive',
  INACTIVE: 'patientStatusInactive',
  COMPLETED: 'patientStatusCompleted',
  ARCHIVED: 'patientStatusArchived',
};

const SEX_KEYS: Record<PatientSex, MessageKey> = {
  FEMALE: 'patientSexFemale',
  MALE: 'patientSexMale',
  OTHER: 'patientSexOther',
  UNKNOWN: 'patientSexUnknown',
};

const HISTORY_KEYS: Record<PatientHistoryItem['action'], MessageKey> = {
  PATIENT_CREATED: 'patientHistoryCreated',
  PATIENT_ADMINISTRATIVE_UPDATED: 'patientHistoryUpdated',
  PATIENT_STATUS_CHANGED: 'patientHistoryStatusChanged',
  PATIENT_RESPONSIBLE_PRACTITIONER_CHANGED: 'patientHistoryPractitionerChanged',
};

export function patientStatusLabel(status: PatientStatus): string {
  return t(STATUS_KEYS[status]);
}

export function patientSexLabel(sex: PatientSex): string {
  return t(SEX_KEYS[sex]);
}

export function patientHistoryActionLabel(item: PatientHistoryItem): string {
  const base = t(HISTORY_KEYS[item.action]);
  if (item.action === 'PATIENT_STATUS_CHANGED' && item.statusChange) {
    return `${base}: ${patientStatusLabel(item.statusChange.from)} → ${patientStatusLabel(item.statusChange.to)}`;
  }
  return base;
}

export function mapApiErrorToMessage(code: string | undefined): string {
  switch (code) {
    case 'PATIENT_NOT_FOUND':
    case 'NOT_FOUND':
      return t('patientErrorNotFound');
    case 'PATIENT_UPDATE_CONFLICT':
    case 'CONFLICT':
      return t('patientErrorConflict');
    case 'RESPONSIBLE_PRACTITIONER_NOT_FOUND':
      return t('patientErrorPractitioner');
    case 'VALIDATION_FAILED':
      return t('patientErrorValidation');
    case 'FORBIDDEN':
      return t('patientErrorForbidden');
    case 'UNAUTHENTICATED':
      return t('sessionExpired');
    default:
      return t('patientErrorGeneric');
  }
}
