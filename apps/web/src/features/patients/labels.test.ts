import { describe, expect, it } from 'vitest';
import { mapApiErrorToMessage, patientHistoryActionLabel, patientStatusLabel } from './labels';

describe('patient labels', () => {
  it('maps statuses to Ukrainian text (not color-only)', () => {
    expect(patientStatusLabel('ACTIVE')).toContain('Актив');
    expect(patientStatusLabel('ARCHIVED')).toContain('Архів');
  });

  it('maps history actions including status transitions', () => {
    expect(
      patientHistoryActionLabel({
        id: '1',
        action: 'PATIENT_CREATED',
        occurredAt: '2026-01-01T00:00:00.000Z',
        actor: { id: 'u', displayName: 'Olena' },
        changedFields: [],
      }),
    ).toContain('створено');

    expect(
      patientHistoryActionLabel({
        id: '2',
        action: 'PATIENT_STATUS_CHANGED',
        occurredAt: '2026-01-01T00:00:00.000Z',
        actor: { id: 'u', displayName: 'Olena' },
        changedFields: ['status'],
        statusChange: { from: 'ACTIVE', to: 'COMPLETED' },
      }),
    ).toMatch(/Активний → Завершено/);
  });

  it('maps API error codes to staff-facing Ukrainian copy', () => {
    expect(mapApiErrorToMessage('PATIENT_NOT_FOUND')).toContain('не знайдено');
    expect(mapApiErrorToMessage('PATIENT_UPDATE_CONFLICT')).toContain('змінені');
    expect(mapApiErrorToMessage('RESPONSIBLE_PRACTITIONER_NOT_FOUND')).toContain('реабілітолог');
  });
});
