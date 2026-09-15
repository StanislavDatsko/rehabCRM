import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('patient can use only the patient portal surface', async ({ page }) => {
  await signIn(page, 'patient');
  await expect(page).toHaveURL(/\/patient$/);
  await expect(page.getByRole('link', { name: 'Огляд' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Мій план' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Мій прогрес' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Пацієнти' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Адміністрування' })).toHaveCount(0);
  await page.goto('/patient/plan');
  await expect(page.getByRole('heading', { name: 'Мій план' })).toBeVisible();
  await page.goto('/patient/progress');
  await expect(page.getByRole('heading', { name: 'Мій прогрес' })).toBeVisible();
  await page.goto('/patient/notifications');
  await expect(page.getByRole('heading', { name: 'Сповіщення' })).toBeVisible();
  await expect(page.getByText('Ваш план оновлено')).toBeVisible();
});

test('patient cannot enter the staff application', async ({ page }) => {
  await signIn(page, 'patient');
  await page.goto('/app');
  await expect(page).toHaveURL(/\/patient|\/login/);
});

test('patient can log out and is returned to login', async ({ page }) => {
  await signIn(page, 'patient');
  await page.getByRole('button', { name: 'Вийти' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/patient');
  await expect(page).toHaveURL(/\/login/);
});

test('patient can submit monitoring and clinician can review provenance', async ({ page }) => {
  await signIn(page, 'patient');
  await page.goto('/patient/daily-report');
  await expect(page.getByRole('heading', { name: 'Щоденний звіт' })).toBeVisible();
  if (await page.getByRole('button', { name: 'Зберегти звіт' }).count()) {
    await page.getByRole('slider', { name: 'Рівень болю' }).fill('3');
    await page.getByRole('slider', { name: 'Рівень втоми' }).fill('2');
    await page.getByRole('slider', { name: 'Загальне самопочуття' }).fill('8');
    await page.getByRole('button', { name: 'Зберегти звіт' }).click();
    await page.goto('/patient/progress');
  }
  await page.goto('/patient/progress');
  await expect(page.getByText('внесено пацієнтом').first()).toBeVisible();

  await signIn(page, 'specialist');
  await page.goto('/app/patients/d1000000-0000-4000-8000-000000000001/monitoring');
  await expect(page.getByRole('heading', { name: 'Дані, внесені пацієнтом' })).toBeVisible();
  await expect(page.getByText('PATIENT_REPORTED').first()).toBeVisible();
});
