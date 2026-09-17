import { describe, expect, it } from 'vitest';
import { patientNav, routeForRole } from './navigation';

describe('patient portal navigation boundary', () => {
  it('exposes only patient-facing destinations', () => {
    expect(patientNav.map((item) => item.href)).toEqual(['/patient', '/patient/plan', '/patient/progress']);
    expect(patientNav.some((item) => item.href.startsWith('/app'))).toBe(false);
  });

  it('routes patients separately while preserving staff routing', () => {
    expect(routeForRole('PATIENT')).toBe('/patient');
    for (const role of ['REHABILITATION_SPECIALIST', 'ORGANIZATION_ADMIN', 'SYSTEM_ADMIN']) {
      expect(routeForRole(role)).toBe('/app');
    }
  });
});
