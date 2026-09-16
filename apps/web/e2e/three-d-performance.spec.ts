import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test(
  '3D anatomy reaches an interactive canvas within the pilot budget',
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'The performance budget is measured once in Chromium; core workflows exercise 3D in every project.',
    );
    await signIn(page, 'specialist');
    const started = Date.now();
    await page.goto('/app/patients/d1000000-0000-4000-8000-000000000001/body-map');
    await expect(page.getByTestId('human-atlas-canvas')).toHaveAttribute('data-atlas-ready', 'true', { timeout: 15_000 });
    expect(Date.now() - started).toBeLessThan(15_000);
  },
);
