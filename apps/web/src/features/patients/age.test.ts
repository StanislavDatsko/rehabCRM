import { describe, expect, it } from 'vitest';
import { ageFromDateOfBirth, formatDateOfBirth } from './age';

describe('ageFromDateOfBirth', () => {
  it('computes age from calendar date without UTC shift', () => {
    const today = new Date(2026, 8, 2); // 2 Sep 2026 local
    expect(ageFromDateOfBirth('1990-05-12', today)).toBe(36);
    expect(ageFromDateOfBirth('1990-09-03', today)).toBe(35);
    expect(ageFromDateOfBirth('1990-09-02', today)).toBe(36);
  });

  it('rejects invalid and future dates', () => {
    const today = new Date(2026, 0, 1);
    expect(ageFromDateOfBirth('1990-02-31', today)).toBeNull();
    expect(ageFromDateOfBirth('not-a-date', today)).toBeNull();
    expect(ageFromDateOfBirth('2099-01-01', today)).toBeNull();
    expect(ageFromDateOfBirth(null, today)).toBeNull();
  });
});

describe('formatDateOfBirth', () => {
  it('formats YYYY-MM-DD as DD.MM.YYYY', () => {
    expect(formatDateOfBirth('1990-05-12')).toBe('12.05.1990');
    expect(formatDateOfBirth(undefined)).toBeNull();
  });
});
