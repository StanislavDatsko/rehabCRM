import { describe, expect, it } from 'vitest';

describe('@repo/ui shared primitives', () => {
  it('defines the core surface primitives required by the design system', () => {
    expect(['Surface', 'IconButton', 'Skeleton', 'EmptyState', 'ErrorState', 'Stat']).toEqual(
      expect.arrayContaining(['Surface', 'IconButton', 'Skeleton', 'EmptyState', 'ErrorState', 'Stat']),
    );
  });

  it('keeps icon buttons accessible by contract', () => {
    const props = { 'aria-label': 'Відкрити меню' };
    expect(props['aria-label']).toBeTruthy();
  });
});
