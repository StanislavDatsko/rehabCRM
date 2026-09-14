import { PERMISSIONS, type CurrentUserResponse, type Permission } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { canCreateClinicalReport, canReadClinicalReports, canReadClinicalTimeline, canReadProgress, canVoidClinicalReport } from './permissions';

const user = (permissions: Permission[]): CurrentUserResponse => ({ id: 'u', email: 'u@example.invalid', displayName: 'U', organization: { id: 'o', name: 'O' }, role: 'REHABILITATION_SPECIALIST', permissions });
describe('Phase 8 UI permissions', () => {
  it('checks exact grants for every surface and command', () => {
    expect(canReadProgress(user([PERMISSIONS.PROGRESS_READ]))).toBe(true);
    expect(canReadClinicalTimeline(user([]))).toBe(false);
    expect(canReadClinicalReports(user([PERMISSIONS.CLINICAL_REPORT_READ]))).toBe(true);
    expect(canCreateClinicalReport(user([PERMISSIONS.CLINICAL_REPORT_READ]))).toBe(false);
    expect(canVoidClinicalReport(user([PERMISSIONS.CLINICAL_REPORT_VOID]))).toBe(true);
  });
});
