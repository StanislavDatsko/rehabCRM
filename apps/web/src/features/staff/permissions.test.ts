import { PERMISSIONS, type CurrentUserResponse } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { canCreateStaff, canReadStaff, canRevokeStaffSessions } from './permissions';

function user(permissions: CurrentUserResponse['permissions']): CurrentUserResponse {
  return {
    id: 'user',
    email: 'staff@example.com',
    displayName: 'Staff',
    organization: { id: 'org', name: 'Org' },
    role: 'ORGANIZATION_ADMIN',
    permissions,
  };
}

describe('staff UI permissions', () => {
  it('uses explicit staff permissions rather than role names', () => {
    expect(canReadStaff(user([PERMISSIONS.STAFF_READ]))).toBe(true);
    expect(canCreateStaff(user([PERMISSIONS.STAFF_READ]))).toBe(false);
    expect(canRevokeStaffSessions(user([PERMISSIONS.STAFF_SESSION_REVOKE]))).toBe(true);
  });
});
