import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('receptionist uses patient and scheduling administration without staff access', async ({
  page,
}) => {
  await signIn(page, 'receptionist');
  await page.getByRole('link', { name: 'Пацієнти' }).click();
  await expect(page.getByRole('heading', { name: 'Пацієнти' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Адміністрування' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Календар' }).click();
  await expect(page.getByRole('heading', { name: 'Календар' })).toBeVisible();
});

test('specialist opens progress, reports, and the 3D body map', async ({ page }) => {
  await signIn(page, 'specialist');
  const patient = 'd1000000-0000-4000-8000-000000000001';
  await page.goto(`/app/patients/${patient}`);
  await expect(page.getByRole('heading', { name: 'Фото та відео' })).toBeVisible();
  await page.goto(`/app/patients/${patient}/progress`);
  await expect(page.getByRole('heading').first()).toBeVisible();
  await page.goto(`/app/patients/${patient}/reports`);
  await expect(page.getByText(/звіт|report/i).first()).toBeVisible();
  await page.goto(`/app/patients/${patient}/body-map`);
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
  await page.goto('/app/alerts');
  await expect(page.getByRole('heading', { name: 'Пацієнти, що потребують уваги' })).toBeVisible();
});

test('organization admin opens staff administration without a CRM password field', async ({
  page,
}) => {
  await signIn(page, 'admin');
  await page.getByRole('link', { name: 'Адміністрування' }).click();
  await expect(page.getByRole('heading', { name: 'Персонал' })).toBeVisible();
  await page.getByRole('link', { name: 'Додати працівника' }).click();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByText(/Пароль не створюється/)).toBeVisible();
});

test('another organization cannot retrieve the demo organization patient', async ({ page }) => {
  await signIn(page, 'other-specialist');
  await page.goto('/app/patients/d1000000-0000-4000-8000-000000000001/body-map');
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});
