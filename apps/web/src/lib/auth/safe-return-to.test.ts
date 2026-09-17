import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './safe-return-to';

describe('safeReturnTo', () => {
  it.each(['/invite/abc', '/invite/a_b-c'])('accepts %s', (value) => expect(safeReturnTo(value)).toBe(value));
  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', '/invite/%2F%2Fevil.com', '/invite/a\\b', '/invite/a\n'])('rejects %s', (value) => expect(safeReturnTo(value)).toBe('/'));
  it('defaults to root without returnTo', () => expect(safeReturnTo()).toBe('/'));
});
