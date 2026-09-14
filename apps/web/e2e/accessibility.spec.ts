import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('core authenticated pages have no serious or critical axe violations', async ({ page }) => {
  await signIn(page, 'receptionist');
  for (const path of ['/app', '/app/patients', '/app/calendar']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (item) => item.impact === 'serious' || item.impact === 'critical',
    );
    expect(blocking, `${path}: ${blocking.map((item) => item.id).join(', ')}`).toEqual([]);
  }
});
