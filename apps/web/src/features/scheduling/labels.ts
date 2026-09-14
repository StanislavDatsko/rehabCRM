import type { AppointmentStatus, EncounterStatus } from '@repo/contracts';
import { t, type MessageKey } from '../../i18n/messages';

const APPOINTMENT_STATUS_KEYS: Record<AppointmentStatus, MessageKey> = {
  SCHEDULED: 'appointmentStatusScheduled',
  CONFIRMED: 'appointmentStatusConfirmed',
  CHECKED_IN: 'appointmentStatusCheckedIn',
  IN_PROGRESS: 'appointmentStatusInProgress',
  COMPLETED: 'appointmentStatusCompleted',
  CANCELLED: 'appointmentStatusCancelled',
  NO_SHOW: 'appointmentStatusNoShow',
};

const ENCOUNTER_STATUS_KEYS: Record<EncounterStatus, MessageKey> = {
  IN_PROGRESS: 'encounterStatusInProgress',
  COMPLETED: 'encounterStatusCompleted',
  CANCELLED: 'encounterStatusCancelled',
};

export function appointmentStatusLabel(status: AppointmentStatus): string {
  return t(APPOINTMENT_STATUS_KEYS[status]);
}

export function encounterStatusLabel(status: EncounterStatus): string {
  return t(ENCOUNTER_STATUS_KEYS[status]);
}

export function appointmentActionLabel(action: string): string {
  switch (action) {
    case 'confirm':
      return t('appointmentActionConfirm');
    case 'check-in':
      return t('appointmentActionCheckIn');
    case 'start-encounter':
      return t('appointmentActionStartEncounter');
    case 'cancel':
      return t('appointmentActionCancel');
    case 'no-show':
      return t('appointmentActionNoShow');
    default:
      return action;
  }
}

export function mapSchedulingErrorToMessage(code: string | undefined): string {
  switch (code) {
    case 'APPOINTMENT_NOT_FOUND':
    case 'NOT_FOUND':
      return t('schedulingErrorNotFound');
    case 'APPOINTMENT_TIME_CONFLICT':
    case 'CONFLICT':
      return t('schedulingErrorConflict');
    case 'APPOINTMENT_UPDATE_CONFLICT':
      return t('schedulingErrorUpdateConflict');
    case 'APPOINTMENT_INVALID_TRANSITION':
      return t('schedulingErrorInvalidTransition');
    case 'PATIENT_NOT_SCHEDULABLE':
      return t('schedulingErrorNotSchedulable');
    case 'PRACTITIONER_NOT_AVAILABLE':
      return t('schedulingErrorPractitionerUnavailable');
    case 'PRACTITIONER_NOT_FOUND':
      return t('schedulingErrorPractitionerNotFound');
    case 'ENCOUNTER_ALREADY_EXISTS':
      return t('schedulingErrorEncounterExists');
    case 'ENCOUNTER_NOT_FOUND':
      return t('schedulingErrorEncounterNotFound');
    case 'ENCOUNTER_INVALID_TRANSITION':
      return t('schedulingErrorEncounterInvalidTransition');
    case 'VALIDATION_FAILED':
      return t('schedulingErrorValidation');
    case 'FORBIDDEN':
      return t('schedulingErrorForbidden');
    case 'UNAUTHENTICATED':
      return t('sessionExpired');
    default:
      return t('schedulingErrorGeneric');
  }
}
