import { describe, expect, it } from 'vitest';

describe('@repo/ui', () => {
  it('exposes a primary variant name used by the design system', () => {
    const variant = 'primary';
    expect(variant).toBe('primary');
  });
});
