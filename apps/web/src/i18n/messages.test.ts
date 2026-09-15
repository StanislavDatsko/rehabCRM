import { describe, expect, it } from 'vitest';
import { t } from './messages';

describe('i18n', () => {
  it('keeps copy out of domain logic and defaults to Ukrainian', () => {
    expect(t('productName')).toBe('RehabMIS');
    expect(t('tagline').toLowerCase()).toContain('медична інформаційна система');
    expect(t('staffOnly', 'en').toLowerCase()).toContain('system');
  });

  it('provides Ukrainian patient CRM strings', () => {
    expect(t('patientsTitle')).toBe('Пацієнти');
    expect(t('patientsEmptyTitle')).toContain('немає');
    expect(t('patientErrorConflict')).toContain('змінені');
    expect(t('patientsTitle', 'en')).toBe('Patients');
  });
});
