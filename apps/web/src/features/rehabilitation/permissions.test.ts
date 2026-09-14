import { PERMISSIONS, type CurrentUserResponse } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { canCreatePlan, canEditPlan, canReadPlans } from './permissions';

const user = (permissions: CurrentUserResponse['permissions']): CurrentUserResponse => ({
  id: 'user',
  email: 'user@example.test',
  displayName: 'User',
  role: 'REHABILITATION_SPECIALIST',
  organization: { id: 'org', name: 'Org' },
  permissions,
});

describe('rehabilitation UI permissions', () => {
  it('requires all clinical read permissions for the plan projection', () => {
    expect(canReadPlans(user([PERMISSIONS.REHABILITATION_PLAN_READ]))).toBe(false);
    expect(
      canReadPlans(
        user([
          PERMISSIONS.REHABILITATION_PLAN_READ,
          PERMISSIONS.REHABILITATION_GOAL_READ,
          PERMISSIONS.EXERCISE_PRESCRIPTION_READ,
        ]),
      ),
    ).toBe(true);
  });

  it('does not infer clinical plan access from an administrative role', () => {
    const admin = { ...user([]), role: 'ORGANIZATION_ADMIN' as const };
    expect(canReadPlans(admin)).toBe(false);
    expect(canCreatePlan(admin)).toBe(false);
    expect(canEditPlan(admin)).toBe(false);
  });
});
