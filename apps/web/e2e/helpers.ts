import { expect, type Page } from '@playwright/test';

const passwordByUser: Record<string, string | undefined> = {
  admin: process.env.E2E_ADMIN_PASSWORD ?? 'DevOnly!OrgAdmin1',
  specialist: process.env.E2E_SPECIALIST_PASSWORD ?? 'DevOnly!Specialist1',
  'other-specialist': process.env.E2E_OTHER_SPECIALIST_PASSWORD ?? 'DevOnly!OtherSpec1',
  patient: process.env.E2E_PATIENT_PASSWORD ?? 'DevOnly!Patient1',
};

export async function signIn(page: Page, username: keyof typeof passwordByUser): Promise<void> {
  const usernameField = page.locator('#username');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/login');
    await page.getByRole('button', { name: /увійти|sign in/i }).click();

    try {
      await expect(usernameField).toBeVisible({ timeout: 10_000 });
      break;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }

      // A freshly started Keycloak/Auth.js pair can reject its first callback while
      // discovery is still warming up. Clear the rejected callback state and retry
      // the complete provider hand-off once.
      await page.context().clearCookies();
    }
  }

  await usernameField.fill(username);
  await page.locator('#password').fill(passwordByUser[username] ?? '');
  await page.locator('#kc-login').click();
  const expectedRoute = username === 'patient' ? /\/patient(?:$|\/)/ : /\/app(?:$|\/)/;
  try {
    await expect(page).toHaveURL(expectedRoute, { timeout: 15_000 });
  } catch {
    throw new Error(`E2E authentication route failed for ${username} at ${new Date().toISOString()}: ${page.url()}`);
  }
  if (username === 'patient') {
    await expect(page.getByRole('link', { name: 'Огляд' })).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(page.getByText('Робоче місце фахівця')).toBeVisible({ timeout: 15_000 });
  }
}
