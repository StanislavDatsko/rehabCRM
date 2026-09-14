import { PERMISSIONS } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { permissionsForRole, roleHasPermission } from './role-permissions';

describe('role permission mapping', () => {
  it('does not grant clinical note read to receptionists', () => {
    expect(roleHasPermission('RECEPTIONIST', PERMISSIONS.CLINICAL_NOTE_READ)).toBe(false);
    expect(permissionsForRole('RECEPTIONIST')).not.toContain(PERMISSIONS.CLINICAL_NOTE_READ);
    expect(permissionsForRole('RECEPTIONIST')).not.toContain(PERMISSIONS.ASSESSMENT_READ);
    expect(permissionsForRole('RECEPTIONIST')).not.toContain(PERMISSIONS.MEASUREMENT_READ);
  });

  it('grants the structured assessment workflow only to specialists', () => {
    const permissions = permissionsForRole('REHABILITATION_SPECIALIST');
    expect(permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.ASSESSMENT_READ,
        PERMISSIONS.ASSESSMENT_CREATE,
        PERMISSIONS.ASSESSMENT_UPDATE,
        PERMISSIONS.ASSESSMENT_COMPLETE,
        PERMISSIONS.ASSESSMENT_VOID,
        PERMISSIONS.MEASUREMENT_READ,
        PERMISSIONS.MEASUREMENT_WRITE,
        PERMISSIONS.ASSESSMENT_TEMPLATE_READ,
      ]),
    );
    expect(permissionsForRole('ORGANIZATION_ADMIN')).not.toContain(PERMISSIONS.ASSESSMENT_READ);
  });

  it('grants rehabilitation planning only to specialists', () => {
    const specialist = permissionsForRole('REHABILITATION_SPECIALIST');
    expect(specialist).toEqual(
      expect.arrayContaining([
        PERMISSIONS.REHABILITATION_PLAN_READ,
        PERMISSIONS.REHABILITATION_PLAN_CREATE,
        PERMISSIONS.REHABILITATION_PLAN_UPDATE,
        PERMISSIONS.REHABILITATION_PLAN_ACTIVATE,
        PERMISSIONS.REHABILITATION_PLAN_PAUSE,
        PERMISSIONS.REHABILITATION_PLAN_COMPLETE,
        PERMISSIONS.REHABILITATION_PLAN_CANCEL,
        PERMISSIONS.REHABILITATION_GOAL_READ,
        PERMISSIONS.REHABILITATION_GOAL_WRITE,
        PERMISSIONS.EXERCISE_PRESCRIPTION_READ,
        PERMISSIONS.EXERCISE_PRESCRIPTION_WRITE,
      ]),
    );
    for (const role of ['RECEPTIONIST', 'ORGANIZATION_ADMIN', 'SYSTEM_ADMIN'] as const) {
      expect(permissionsForRole(role)).not.toContain(PERMISSIONS.REHABILITATION_PLAN_READ);
      expect(permissionsForRole(role)).not.toContain(PERMISSIONS.REHABILITATION_GOAL_READ);
      expect(permissionsForRole(role)).not.toContain(PERMISSIONS.EXERCISE_PRESCRIPTION_READ);
    }
  });

  it('grants clinical note read to rehabilitation specialists', () => {
    expect(roleHasPermission('REHABILITATION_SPECIALIST', PERMISSIONS.CLINICAL_NOTE_READ)).toBe(
      true,
    );
  });

  it('grants the administrative patient workflow to desk roles', () => {
    for (const role of ['RECEPTIONIST', 'ORGANIZATION_ADMIN'] as const) {
      expect(roleHasPermission(role, PERMISSIONS.PATIENT_READ_ADMIN)).toBe(true);
      expect(roleHasPermission(role, PERMISSIONS.PATIENT_CREATE)).toBe(true);
      expect(roleHasPermission(role, PERMISSIONS.PATIENT_UPDATE_ADMIN)).toBe(true);
      expect(roleHasPermission(role, PERMISSIONS.PATIENT_CHANGE_STATUS)).toBe(true);
    }
  });

  it('grants specialists read-only patient admin access with encounter permissions', () => {
    expect(roleHasPermission('REHABILITATION_SPECIALIST', PERMISSIONS.PATIENT_READ_ADMIN)).toBe(
      true,
    );
    expect(roleHasPermission('REHABILITATION_SPECIALIST', PERMISSIONS.PATIENT_CREATE)).toBe(false);
    expect(roleHasPermission('REHABILITATION_SPECIALIST', PERMISSIONS.ENCOUNTER_START)).toBe(true);
    expect(roleHasPermission('REHABILITATION_SPECIALIST', PERMISSIONS.ENCOUNTER_COMPLETE)).toBe(
      true,
    );
  });

  it('does not grant PHI clinical permissions to system admins by default', () => {
    expect(roleHasPermission('SYSTEM_ADMIN', PERMISSIONS.CLINICAL_NOTE_READ)).toBe(false);
    expect(roleHasPermission('SYSTEM_ADMIN', PERMISSIONS.PATIENT_READ_CLINICAL)).toBe(false);
    expect(roleHasPermission('SYSTEM_ADMIN', PERMISSIONS.BODY_ANNOTATION_READ)).toBe(false);
  });

  it('limits staff administration to organization administrators', () => {
    const mutations = [
      PERMISSIONS.STAFF_CREATE,
      PERMISSIONS.STAFF_UPDATE,
      PERMISSIONS.STAFF_CHANGE_ROLE,
      PERMISSIONS.STAFF_DISABLE,
      PERMISSIONS.STAFF_ENABLE,
      PERMISSIONS.STAFF_SESSION_REVOKE,
    ];
    expect(permissionsForRole('ORGANIZATION_ADMIN')).toEqual(expect.arrayContaining(mutations));
    for (const role of ['RECEPTIONIST', 'REHABILITATION_SPECIALIST', 'SYSTEM_ADMIN'] as const) {
      mutations.forEach((permission) => expect(permissionsForRole(role)).not.toContain(permission));
    }
    expect(permissionsForRole('RECEPTIONIST')).not.toContain(PERMISSIONS.STAFF_READ);
    expect(permissionsForRole('REHABILITATION_SPECIALIST')).not.toContain(PERMISSIONS.STAFF_READ);
  });

  it('grants body annotation workflow only to rehabilitation specialists', () => {
    const specialist = permissionsForRole('REHABILITATION_SPECIALIST');
    expect(specialist).toEqual(
      expect.arrayContaining([
        PERMISSIONS.ANATOMY_READ,
        PERMISSIONS.ANATOMY_MODEL_READ,
        PERMISSIONS.BODY_ANNOTATION_READ,
        PERMISSIONS.BODY_ANNOTATION_CREATE,
        PERMISSIONS.BODY_ANNOTATION_UPDATE,
        PERMISSIONS.BODY_ANNOTATION_RESOLVE,
        PERMISSIONS.BODY_ANNOTATION_VOID,
      ]),
    );
    expect(permissionsForRole('RECEPTIONIST')).not.toContain(PERMISSIONS.BODY_ANNOTATION_READ);
    expect(permissionsForRole('ORGANIZATION_ADMIN')).not.toContain(
      PERMISSIONS.BODY_ANNOTATION_READ,
    );
  });

  it('grants Phase 8 progress and report permissions only to specialists', () => {
    const expected = [
      PERMISSIONS.PROGRESS_READ,
      PERMISSIONS.CLINICAL_TIMELINE_READ,
      PERMISSIONS.CLINICAL_REPORT_READ,
      PERMISSIONS.CLINICAL_REPORT_CREATE,
      PERMISSIONS.CLINICAL_REPORT_VOID,
    ];
    expect(permissionsForRole('REHABILITATION_SPECIALIST')).toEqual(
      expect.arrayContaining(expected),
    );
    for (const role of ['RECEPTIONIST', 'ORGANIZATION_ADMIN', 'SYSTEM_ADMIN'] as const) {
      expected.forEach((permission) => expect(permissionsForRole(role)).not.toContain(permission));
    }
  });
});
