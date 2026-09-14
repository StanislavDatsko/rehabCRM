import { describe, expect, it } from 'vitest';
import { t } from './messages';

describe('i18n', () => {
  it('keeps copy out of domain logic and defaults to Ukrainian', () => {
    expect(t('productName')).toBe('RehabCRM');
    expect(t('staffOnly').toLowerCase()).toContain('персоналу');
    expect(t('staffOnly', 'en').toLowerCase()).toContain('staff');
  });

  it('provides Ukrainian patient CRM strings', () => {
    expect(t('patientsTitle')).toBe('Пацієнти');
    expect(t('patientsEmptyTitle')).toContain('немає');
    expect(t('patientErrorConflict')).toContain('змінені');
    expect(t('patientsTitle', 'en')).toBe('Patients');
  });
});
