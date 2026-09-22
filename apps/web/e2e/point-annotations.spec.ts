import { expect, test, type Locator, type Page } from '@playwright/test';
import { signIn } from './helpers';

const PATIENT = 'd1000000-0000-4000-8000-000000000001';
const STRUCTURE = 'Long head of right biceps brachii';

async function openIsolatedBiceps(page: Page): Promise<Locator> {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto(`/app/patients/${PATIENT}/body-map`);
  const canvas = page.getByTestId('human-atlas-canvas');
  await expect(canvas).toHaveAttribute('data-atlas-complete', 'true', { timeout: 60_000 });
  await page.getByPlaceholder('Femur, heart…').fill(STRUCTURE);
  await page.getByRole('button', { name: STRUCTURE }).first().click();
  await page.getByRole('button', { name: 'Isolate', exact: true }).click();
  await expect(page.getByTestId('point-annotations-layer')).toHaveAttribute('data-isolated', 'true');
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700); // camera damping settles on the isolated structure
  return canvas;
}

/** Click without any pointer travel; tries a few spots around the fitted centre until the mesh is hit. */
async function tapIsolatedSurface(page: Page, canvas: Locator): Promise<void> {
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 - 30 };
  const offsets = [
    [0, 0], [0, -24], [0, 24], [-18, 0], [18, 0], [0, -60], [0, 60], [-30, -30], [30, 30],
  ];
  for (const [dx, dy] of offsets) {
    await page.mouse.move(centre.x + dx, centre.y + dy);
    await page.mouse.down();
    await page.mouse.up();
    try {
      await expect(page.getByTestId('point-annotation-composer')).toBeVisible({ timeout: 1_200 });
      return;
    } catch {
      // try the next spot
    }
  }
  throw new Error('Could not hit the isolated mesh surface');
}

async function markerCentre(marker: Locator): Promise<{ x: number; y: number }> {
  const box = (await marker.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function orbit(page: Page, canvas: Locator, dx: number): Promise<void> {
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const start = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.8 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= 8; step += 1)
    await page.mouse.move(start.x + (dx * step) / 8, start.y - step, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(600);
}

test.describe('point annotations on an isolated structure', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL interaction smoke runs once in Chromium.');

  test('create, anchor, hover, delete, hide on full body, persist across reload', async ({ page }) => {
    await signIn(page, 'specialist');
    const canvas = await openIsolatedBiceps(page);
    const layer = page.getByTestId('point-annotations-layer');
    const markers = page.getByTestId('point-annotation-marker');
    const composer = page.getByTestId('point-annotation-composer');

    // Orbit drag must not create a point.
    await orbit(page, canvas, 120);
    await expect(composer).toBeHidden();

    // Tap → temporary marker + composer; Cancel removes it.
    await tapIsolatedSurface(page, canvas);
    await expect(page.getByTestId('point-annotation-draft')).toHaveAttribute('data-visible', 'true');
    await page.getByRole('button', { name: 'Скасувати' }).click();
    await expect(composer).toBeHidden();
    await expect(page.getByTestId('point-annotation-draft')).toHaveCount(0);

    // Tap → type → Save creates a persistent marker.
    await tapIsolatedSurface(page, canvas);
    await expect(page.getByRole('button', { name: 'Зберегти' })).toBeDisabled();
    await page.getByPlaceholder('Додайте коментар до цієї ділянки...').fill('Біль при максимальному згинанні плеча');
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await expect(composer).toBeHidden({ timeout: 15_000 });
    await expect(markers).toHaveCount(1);
    await expect(markers.first()).toHaveAttribute('data-visible', 'true');
    await expect(layer).toHaveAttribute('data-count', '1');

    // 3D correctness: a deterministic camera refit returns the marker to the same pixel after orbiting.
    await page.getByRole('button', { name: 'Fit selected' }).click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const before = await markerCentre(markers.first());
    await orbit(page, canvas, 260);
    const rotated = await markerCentre(markers.first());
    expect(Math.hypot(rotated.x - before.x, rotated.y - before.y)).toBeGreaterThan(4);
    await expect(markers).toHaveCount(1);
    await page.mouse.move(before.x + 120, before.y + 120);
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(500);
    await expect(markers.first()).toBeVisible();
    await page.getByRole('button', { name: 'Fit selected' }).click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const after = await markerCentre(markers.first());
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(3);

    // Hover shows the comment card and connector, leaving hides it.
    await markers.first().hover();
    const hoverCard = page.getByTestId('point-annotation-hover-card');
    await expect(hoverCard).toBeVisible();
    await expect(hoverCard).toContainText('Біль при максимальному згинанні плеча');
    await expect(page.locator('.pa-connector line')).toHaveCount(1);
    await page.mouse.move(after.x + 160, after.y + 160);
    await expect(hoverCard).toBeHidden();

    // Click opens the detail dialog; delete requires confirmation; marker disappears with a toast.
    await markers.first().click();
    const detail = page.getByTestId('point-annotation-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('Нотатка до анатомічної точки');
    await detail.getByRole('button', { name: 'Видалити' }).click();
    const confirm = page.getByTestId('point-annotation-confirm');
    await expect(confirm).toContainText('Видалити цю точкову нотатку?');
    await confirm.getByRole('button', { name: 'Видалити' }).click();
    await expect(page.getByTestId('point-annotation-toast')).toBeVisible({ timeout: 15_000 });
    await expect(markers).toHaveCount(0);

    // Second marker, then leave isolation → hidden, isolate again → visible.
    await tapIsolatedSurface(page, canvas);
    await page.getByPlaceholder('Додайте коментар до цієї ділянки...').fill('Друга точка');
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await expect(markers).toHaveCount(1, { timeout: 15_000 });
    await page.getByRole('button', { name: 'Show all', exact: true }).click();
    await expect(layer).toHaveAttribute('data-isolated', 'false');
    await expect(markers).toHaveCount(0);
    await page.getByRole('button', { name: 'Isolate', exact: true }).click();
    await canvas.scrollIntoViewIfNeeded();
    await expect(markers).toHaveCount(1);
    await expect(markers.first()).toHaveAttribute('data-visible', 'true');

    // Reload: the note is persisted and re-anchored on the same structure.
    await openIsolatedBiceps(page);
    await expect(markers).toHaveCount(1);
    await markers.first().hover();
    await expect(page.getByTestId('point-annotation-hover-card')).toContainText('Друга точка');

    // Clean up the demo patient.
    await markers.first().click();
    await page.getByTestId('point-annotation-detail').getByRole('button', { name: 'Видалити' }).click();
    await page.getByTestId('point-annotation-confirm').getByRole('button', { name: 'Видалити' }).click();
    await expect(markers).toHaveCount(0, { timeout: 15_000 });
  });
});
