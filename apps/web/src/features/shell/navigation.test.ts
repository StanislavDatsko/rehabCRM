import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '@repo/contracts';
import type { CurrentUserResponse } from '@repo/contracts';
import { canSeeNavItem, initials, staffNav } from './navigation';

const receptionist: CurrentUserResponse = {
  id: '1',
  email: 'receptionist@rehabcrm.local',
  displayName: 'Olena Reception Demo',
  organization: { id: 'org', name: 'Demo' },
  role: 'REHABILITATION_SPECIALIST',
  permissions: [PERMISSIONS.PATIENT_READ_ADMIN, PERMISSIONS.APPOINTMENT_READ],
};

const specialist: CurrentUserResponse = {
  ...receptionist,
  role: 'REHABILITATION_SPECIALIST',
  permissions: [PERMISSIONS.CLINICAL_NOTE_READ, PERMISSIONS.REHABILITATION_PLAN_READ],
};

describe('staff navigation visibility', () => {
  it('hides rehabilitation nav from receptionists but not specialists', () => {
    const rehab = staffNav.find((item) => item.id === 'rehab');
    expect(rehab).toBeTruthy();
    expect(canSeeNavItem(receptionist, rehab!)).toBe(false);
    expect(canSeeNavItem(specialist, rehab!)).toBe(true);
  });

  it('enables patients nav for staff with patient.read.admin', () => {
    const patients = staffNav.find((item) => item.id === 'patients');
    expect(patients).toMatchObject({
      href: '/app/patients',
      enabled: true,
    });
    expect(canSeeNavItem(receptionist, patients!)).toBe(true);
    expect(canSeeNavItem(specialist, patients!)).toBe(false);
  });

  it('enables calendar nav for staff with appointment.read', () => {
    const calendar = staffNav.find((item) => item.id === 'calendar');
    expect(calendar).toMatchObject({
      href: '/app/calendar',
      enabled: true,
    });
    expect(canSeeNavItem(receptionist, calendar!)).toBe(true);
    expect(canSeeNavItem(specialist, calendar!)).toBe(false);
  });

  it('builds initials without exposing tokens', () => {
    expect(initials('Olena Reception Demo')).toBe('OR');
  });
});
