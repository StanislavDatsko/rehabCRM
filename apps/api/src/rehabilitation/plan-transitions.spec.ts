import { describe, expect, it } from 'vitest';
import { canTransitionPlan } from './plan-transitions';

describe('rehabilitation plan state machine', () => {
  it.each([
    ['DRAFT', 'ACTIVE'],
    ['DRAFT', 'CANCELLED'],
    ['ACTIVE', 'PAUSED'],
    ['ACTIVE', 'COMPLETED'],
    ['ACTIVE', 'CANCELLED'],
    ['PAUSED', 'ACTIVE'],
    ['PAUSED', 'COMPLETED'],
    ['PAUSED', 'CANCELLED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(canTransitionPlan(from, to)).toBe(true);
  });

  it.each([
    ['COMPLETED', 'ACTIVE'],
    ['CANCELLED', 'ACTIVE'],
    ['DRAFT', 'COMPLETED'],
    ['ACTIVE', 'DRAFT'],
    ['PAUSED', 'DRAFT'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(canTransitionPlan(from, to)).toBe(false);
  });
});
