import { describe, expect, it } from 'vitest';
import { isPatientNavActive } from './patient-nav';

describe('patient portal navigation', () => {
  it('matches exact and nested sections without marking overview globally active', () => {
    expect(isPatientNavActive('/patient/progress', '/patient/progress')).toBe(true);
    expect(isPatientNavActive('/patient/progress/details', '/patient/progress')).toBe(true);
    expect(isPatientNavActive('/patient/progress', '/patient')).toBe(false);
    expect(isPatientNavActive('/patient', '/patient')).toBe(true);
  });
});
