import { describe, expect, it } from 'vitest';
import {
  CLINICAL_REPORT_SECTIONS,
  CLINICAL_TIMELINE_CATEGORIES,
  defaultPagination,
  hasPermission,
  PERMISSIONS,
} from './index';

describe('defaultPagination', () => {
  it('clamps invalid values', () => {
    expect(defaultPagination(0, 0)).toEqual({ page: 1, pageSize: 20 });
    expect(defaultPagination(2, 500)).toEqual({ page: 2, pageSize: 100 });
  });
});

describe('Phase 8 contracts', () => {
  it('keeps timeline categories and report sections explicit', () => {
    expect(CLINICAL_TIMELINE_CATEGORIES).toEqual([
      'ENCOUNTER',
      'ASSESSMENT',
      'MEASUREMENT',
      'REHABILITATION_PLAN',
      'GOAL',
      'BODY_ANNOTATION',
    ]);
    expect(CLINICAL_REPORT_SECTIONS).toContain('MEASUREMENT_TRENDS');
  });
});

describe('hasPermission', () => {
  it('is an exact grant check', () => {
    expect(hasPermission([PERMISSIONS.CLINICAL_NOTE_READ], PERMISSIONS.CLINICAL_NOTE_READ)).toBe(
      true,
    );
    expect(hasPermission([PERMISSIONS.APPOINTMENT_READ], PERMISSIONS.CLINICAL_NOTE_READ)).toBe(
      false,
    );
  });
});
