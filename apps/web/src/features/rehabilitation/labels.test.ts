import { describe, expect, it } from 'vitest';
import { rehabilitationErrorMessage } from './labels';

describe('rehabilitation error UX', () => {
  it('maps stale saves and baseline mismatch to safe Ukrainian guidance', () => {
    expect(rehabilitationErrorMessage('REHABILITATION_PLAN_UPDATE_CONFLICT')).toContain(
      'Оновіть сторінку',
    );
    expect(rehabilitationErrorMessage('REHABILITATION_GOAL_MEASUREMENT_MISMATCH')).toContain(
      'не відповідає',
    );
  });
});
