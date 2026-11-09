import { describe, expect, it } from 'vitest';
import { formatPrice } from './price';

describe('formatPrice', () => {
  it('distinguishes unset, free and paid', () => {
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(0)).toBe('Безкоштовно');
    expect(formatPrice(500)).toMatch(/^500\s₴$/);
  });
});
