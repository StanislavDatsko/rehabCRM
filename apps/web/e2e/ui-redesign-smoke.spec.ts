import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const staffRoutes = [
  '/app',
  '/app/patients',
  '/app/calendar',
  '/app/rehabilitation-plans',
  '/app/exercises',
  '/app/anatomy',
  '/app/reports',
  '/app/alerts',
  '/app/administration/staff',
];

test.describe('enterprise UI regression matrix', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin');
  });

  for (const width of [1440, 1536, 1728, 1920]) {
    test(`renders core staff routes without overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      for (const route of staffRoutes) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main#main')).toBeVisible();
        await expect(page.locator('h1').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    });
  }

  test('supports keyboard command palette flow', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Швидка навігація' })).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Швидка навігація' }).click();
    const input = page.locator('#command-query');
    await expect(input).toBeVisible();
    await input.focus();
    await expect(input).toBeFocused();
    await input.fill('новий пацієнт');
    await expect(page.locator('#command-results').getByRole('link', { name: /Новий пацієнт/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(input).toBeHidden();
  });

  test('keeps mobile shell usable and honors reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app', { waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Відкрити меню' })).toBeVisible();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--duration-ui').trim())).toBe('180ms');
    expect(await page.evaluate(() => getComputedStyle(document.body).animationDuration)).toBe('0s');
  });
});
