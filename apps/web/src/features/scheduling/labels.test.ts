import { describe, expect, it } from 'vitest';
import {
  appointmentStatusLabel,
  mapSchedulingErrorToMessage,
} from './labels';

describe('scheduling labels', () => {
  it('maps appointment statuses to Ukrainian text', () => {
    expect(appointmentStatusLabel('SCHEDULED')).toContain('Заплан');
    expect(appointmentStatusLabel('CHECKED_IN')).toContain('прибув');
    expect(appointmentStatusLabel('NO_SHOW')).toContain('явився');
  });

  it('maps scheduling API error codes to Ukrainian copy', () => {
    expect(mapSchedulingErrorToMessage('APPOINTMENT_TIME_CONFLICT')).toContain('реабілітолог');
    expect(mapSchedulingErrorToMessage('APPOINTMENT_UPDATE_CONFLICT')).toContain('змінений');
    expect(mapSchedulingErrorToMessage('PATIENT_NOT_SCHEDULABLE')).toContain('записати');
    expect(mapSchedulingErrorToMessage('ENCOUNTER_ALREADY_EXISTS')).toContain('вже існує');
  });
});
