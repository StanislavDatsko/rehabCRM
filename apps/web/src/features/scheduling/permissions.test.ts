import { describe, expect, it } from 'vitest';
import { PERMISSIONS, type CurrentUserResponse } from '@repo/contracts';
import {
  canCreateAppointment,
  canReadAppointments,
  canStartEncounter,
  visibleAppointmentActions,
} from './permissions';

const base: CurrentUserResponse = {
  id: '1',
  email: 'a@rehabcrm.local',
  displayName: 'Demo',
  organization: { id: 'org', name: 'Demo' },
  role: 'RECEPTIONIST',
  permissions: [],
};

describe('scheduling UI permissions', () => {
  it('gates read/create/start separately', () => {
    expect(canReadAppointments(base)).toBe(false);
    expect(canCreateAppointment(base)).toBe(false);
    expect(canStartEncounter(base)).toBe(false);

    const receptionist: CurrentUserResponse = {
      ...base,
      permissions: [
        PERMISSIONS.APPOINTMENT_READ,
        PERMISSIONS.APPOINTMENT_CREATE,
        PERMISSIONS.APPOINTMENT_CHANGE_STATUS,
        PERMISSIONS.APPOINTMENT_CANCEL,
      ],
    };
    expect(canReadAppointments(receptionist)).toBe(true);
    expect(canCreateAppointment(receptionist)).toBe(true);
    expect(canStartEncounter(receptionist)).toBe(false);

    const specialist: CurrentUserResponse = {
      ...base,
      role: 'REHABILITATION_SPECIALIST',
      permissions: [
        PERMISSIONS.APPOINTMENT_READ,
        PERMISSIONS.ENCOUNTER_START,
        PERMISSIONS.APPOINTMENT_CHANGE_STATUS,
      ],
    };
    expect(canStartEncounter(specialist)).toBe(true);
  });

  it('shows only valid status actions for checked-in appointments', () => {
    const receptionist: CurrentUserResponse = {
      ...base,
      permissions: [
        PERMISSIONS.APPOINTMENT_CHANGE_STATUS,
        PERMISSIONS.APPOINTMENT_CANCEL,
      ],
    };
    expect(visibleAppointmentActions('SCHEDULED', receptionist)).toEqual([
      'confirm',
      'check-in',
      'no-show',
      'cancel',
    ]);

    const specialist: CurrentUserResponse = {
      ...base,
      permissions: [PERMISSIONS.ENCOUNTER_START],
    };
    expect(visibleAppointmentActions('CHECKED_IN', specialist)).toEqual(['start-encounter']);
  });
});
