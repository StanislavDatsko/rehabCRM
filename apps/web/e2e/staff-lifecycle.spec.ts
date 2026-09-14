import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('organization admin provisions, changes, revokes, disables, and re-enables staff', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Mutating lifecycle runs once against the shared real stack.');
  await signIn(page, 'admin');
  await page.goto('/app/administration/staff/new');
  const uniqueEmail = `phase9-${Date.now()}@example.test`;
  await page.getByLabel('Ім’я').fill('Phase');
  await page.getByLabel('Прізвище').fill('Nine');
  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel('Роль').selectOption('RECEPTIONIST');
  await page.getByRole('button', { name: 'Створити працівника' }).click();
  await expect(page).toHaveURL(/\/app\/administration\/staff\/[0-9a-f-]+/);
  await expect(page.getByText(uniqueEmail)).toBeVisible();

  await page.getByLabel('Роль').selectOption('REHABILITATION_SPECIALIST');
  await page.getByRole('button', { name: 'Змінити роль' }).click();
  await expect(page.getByText('Роль оновлено.')).toBeVisible();

  await page.getByRole('button', { name: 'Завершити всі сеанси' }).click();
  await expect(page.getByText('Усі активні сеанси завершено.')).toBeVisible();
  await page.getByRole('button', { name: 'Вимкнути доступ' }).click();
  await expect(page.getByRole('button', { name: 'Увімкнути доступ' })).toBeVisible();
  await page.getByRole('button', { name: 'Увімкнути доступ' }).click();
  await expect(page.getByRole('button', { name: 'Вимкнути доступ' })).toBeVisible();
});
