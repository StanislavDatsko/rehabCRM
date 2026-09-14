import { PERMISSIONS, type CurrentUserResponse } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { canCreateAssessment, canReadAssessments } from './permissions';

const user = (permissions: CurrentUserResponse['permissions']): CurrentUserResponse => ({
  id: 'u',
  email: 'u@example.invalid',
  displayName: 'User',
  organization: { id: 'o', name: 'Org' },
  role: 'REHABILITATION_SPECIALIST',
  permissions,
});

describe('assessment UI permissions', () => {
  it('requires both assessment and measurement read permissions', () => {
    expect(canReadAssessments(user([PERMISSIONS.ASSESSMENT_READ]))).toBe(false);
    expect(
      canReadAssessments(user([PERMISSIONS.ASSESSMENT_READ, PERMISSIONS.MEASUREMENT_READ])),
    ).toBe(true);
  });
  it('does not expose create without its explicit permission', () => {
    expect(canCreateAssessment(user([]))).toBe(false);
  });
});
