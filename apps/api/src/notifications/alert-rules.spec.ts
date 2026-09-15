import { describe, expect, it } from 'vitest';
import { lowExerciseAttention, missedReportAttention, painAttention } from './alert-rules';
describe('deterministic clinician alert rules', () => {
  it('has defined pain threshold behavior', () => { expect(painAttention(6)).toBeNull(); expect(painAttention(7)?.severity).toBe('ATTENTION'); expect(painAttention(9)?.severity).toBe('HIGH'); expect(painAttention(5, 2)?.summary).toMatch(/збільшився/); });
  it('requires three missing report days', () => { expect(missedReportAttention(2)).toBe(false); expect(missedReportAttention(3)).toBe(true); });
  it('requires three days without exercise completion', () => { expect(lowExerciseAttention(2)).toBe(false); expect(lowExerciseAttention(3)).toBe(true); });
});
