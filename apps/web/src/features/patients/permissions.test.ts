import { describe, expect, it } from 'vitest';
import { PERMISSIONS, type CurrentUserResponse } from '@repo/contracts';
import {
  canChangePatientStatus,
  canCreatePatient,
  canReadPatients,
  canUpdatePatient,
} from './permissions';

const base: CurrentUserResponse = {
  id: '1',
  email: 'a@rehabcrm.local',
  displayName: 'Demo',
  organization: { id: 'org', name: 'Demo' },
  role: 'RECEPTIONIST',
  permissions: [],
};

describe('patient UI permissions', () => {
  it('gates read/create/update/status separately', () => {
    const none = base;
    expect(canReadPatients(none)).toBe(false);
    expect(canCreatePatient(none)).toBe(false);

    const receptionist: CurrentUserResponse = {
      ...base,
      permissions: [
        PERMISSIONS.PATIENT_READ_ADMIN,
        PERMISSIONS.PATIENT_CREATE,
        PERMISSIONS.PATIENT_UPDATE_ADMIN,
        PERMISSIONS.PATIENT_CHANGE_STATUS,
      ],
    };
    expect(canReadPatients(receptionist)).toBe(true);
    expect(canCreatePatient(receptionist)).toBe(true);
    expect(canUpdatePatient(receptionist)).toBe(true);
    expect(canChangePatientStatus(receptionist)).toBe(true);

    const readOnly: CurrentUserResponse = {
      ...base,
      permissions: [PERMISSIONS.PATIENT_READ_ADMIN],
    };
    expect(canReadPatients(readOnly)).toBe(true);
    expect(canCreatePatient(readOnly)).toBe(false);
    expect(canUpdatePatient(readOnly)).toBe(false);
    expect(canChangePatientStatus(readOnly)).toBe(false);
  });
});
