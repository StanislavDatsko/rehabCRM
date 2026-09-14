import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { resolveProgressPeriod } from './progress-period';

describe('progress period resolution', () => {
  const now = new Date('2026-09-03T12:00:00.000Z');
  it('uses a bounded 90-day default', () => {
    expect(resolveProgressPeriod({ period: '90d' }, now, new Date('2020-01-01'))).toEqual({ key: '90d', from: '2026-06-05T12:00:00.000Z', to: now.toISOString(), bounded: true });
  });
  it('requires a current plan boundary', () => {
    expect(() => resolveProgressPeriod({ period: 'current-plan' }, now, new Date('2020-01-01'))).toThrow(BadRequestException);
  });
});
