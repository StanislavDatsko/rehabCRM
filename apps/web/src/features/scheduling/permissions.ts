import {
  APPOINTMENT_STATUSES,
  PERMISSIONS,
  hasPermission,
  type AppointmentStatus,
  type CurrentUserResponse,
} from '@repo/contracts';

export function canReadAppointments(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.APPOINTMENT_READ);
}

export function canCreateAppointment(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.APPOINTMENT_CREATE);
}

export function canUpdateAppointment(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.APPOINTMENT_UPDATE);
}

export function canCancelAppointment(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.APPOINTMENT_CANCEL);
}

export function canChangeAppointmentStatus(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.APPOINTMENT_CHANGE_STATUS);
}

export function canReadEncounter(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.ENCOUNTER_READ);
}

export function canStartEncounter(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.ENCOUNTER_START);
}

export function canCompleteEncounter(user: CurrentUserResponse): boolean {
  return hasPermission(user.permissions, PERMISSIONS.ENCOUNTER_COMPLETE);
}

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  SCHEDULED: ['CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export type AppointmentCommandAction =
  | 'confirm'
  | 'check-in'
  | 'cancel'
  | 'no-show'
  | 'start-encounter';

export function availableStatusTargets(from: AppointmentStatus): AppointmentStatus[] {
  return [...TRANSITIONS[from]];
}

export function visibleAppointmentActions(
  status: AppointmentStatus,
  user: CurrentUserResponse,
): AppointmentCommandAction[] {
  const targets = availableStatusTargets(status);
  const actions: AppointmentCommandAction[] = [];

  if (canChangeAppointmentStatus(user)) {
    if (targets.includes('CONFIRMED')) {
      actions.push('confirm');
    }
    if (targets.includes('CHECKED_IN')) {
      actions.push('check-in');
    }
    if (targets.includes('NO_SHOW')) {
      actions.push('no-show');
    }
  }
  if (canCancelAppointment(user) && targets.includes('CANCELLED')) {
    actions.push('cancel');
  }
  if (canStartEncounter(user) && status === 'CHECKED_IN') {
    actions.push('start-encounter');
  }

  return actions;
}

export function isTerminalAppointmentStatus(status: AppointmentStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_SHOW';
}

export function isValidAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}
