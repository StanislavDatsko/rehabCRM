import { PERMISSIONS } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { permissionsForRole, roleHasPermission } from './role-permissions';

describe('role permission mapping', () => {
  it('keeps patient portal permissions separate from staff permissions', () => {
    expect(permissionsForRole('PATIENT')).toEqual(expect.arrayContaining([
      PERMISSIONS.PATIENT_PORTAL_SELF_READ,
      PERMISSIONS.REHABILITATION_PLAN_SELF_READ,
    ]));
    expect(permissionsForRole('PATIENT')).not.toContain(PERMISSIONS.STAFF_READ);
    expect(permissionsForRole('PATIENT')).not.toContain(PERMISSIONS.PATIENT_READ_ADMIN);
  });

  it('gives specialists the clinical capabilities', () => {
    expect(permissionsForRole('REHABILITATION_SPECIALIST')).toEqual(expect.arrayContaining([
      PERMISSIONS.CLINICAL_NOTE_WRITE,
      PERMISSIONS.ASSESSMENT_CREATE,
      PERMISSIONS.REHABILITATION_PLAN_CREATE,
      PERMISSIONS.BODY_ANNOTATION_READ,
      PERMISSIONS.CLINICAL_REPORT_READ,
    ]));
  });

  it('makes organization admins a clinical and administration superset', () => {
    const admin = permissionsForRole('ORGANIZATION_ADMIN');
    expect(admin).toEqual(expect.arrayContaining(permissionsForRole('REHABILITATION_SPECIALIST')));
    expect(admin).toEqual(expect.arrayContaining([
      PERMISSIONS.STAFF_CREATE,
      PERMISSIONS.PATIENT_CREATE,
      PERMISSIONS.ORGANIZATION_MANAGE,
      PERMISSIONS.AUDIT_READ,
    ]));
  });

  it('makes system admins a full superset while retaining platform permissions', () => {
    expect(permissionsForRole('SYSTEM_ADMIN')).toEqual(
      expect.arrayContaining(permissionsForRole('ORGANIZATION_ADMIN')),
    );
    expect(roleHasPermission('SYSTEM_ADMIN', PERMISSIONS.ANATOMY_MODEL_MANAGE)).toBe(true);
  });
});
