import { expect, type Page } from '@playwright/test';

const accounts = {
  admin: { email: 'admin@rehabcrm.local', password: process.env.E2E_ADMIN_PASSWORD ?? process.env.DEV_SEED_ADMIN_PASSWORD ?? 'RehabLocal123!' },
  specialist: { email: 'specialist@rehabcrm.local', password: process.env.E2E_SPECIALIST_PASSWORD ?? process.env.DEV_SEED_ADMIN_PASSWORD ?? 'RehabLocal123!' },
  'other-specialist': { email: 'other-specialist@rehabcrm.local', password: process.env.E2E_OTHER_SPECIALIST_PASSWORD ?? process.env.DEV_SEED_ADMIN_PASSWORD ?? 'RehabLocal123!' },
  patient: { email: 'patient@rehabcrm.local', password: process.env.E2E_PATIENT_PASSWORD ?? process.env.DEV_SEED_ADMIN_PASSWORD ?? 'RehabLocal123!' },
};

export async function signIn(page: Page, username: keyof typeof accounts): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(accounts[username].email);
  await page.locator('input[name="password"]').fill(accounts[username].password);
  await page.getByRole('button', { name: 'Увійти в систему', exact: true }).click();
  await expect(page).toHaveURL(username === 'patient' ? /\/patient(?:$|\/)/ : /\/app(?:$|\/)/, { timeout: 15_000 });
}
