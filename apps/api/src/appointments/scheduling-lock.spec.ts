import { describe, expect, it } from 'vitest';
import { schedulingLockScope } from './scheduling-lock';
describe('schedulingLockScope', () => {
  it('is deterministic for the same tenant and practitioner', () => expect(schedulingLockScope('org', 'prac')).toBe(schedulingLockScope('org', 'prac')));
  it('separates practitioners', () => expect(schedulingLockScope('org', 'a')).not.toBe(schedulingLockScope('org', 'b')));
  it('separates organizations', () => expect(schedulingLockScope('a', 'prac')).not.toBe(schedulingLockScope('b', 'prac')));
});
