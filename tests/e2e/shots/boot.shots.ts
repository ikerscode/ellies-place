/**
 * Screenshot suite stub (run with `npm run shots`). Owner: qa-engineer, who fills in the tour.
 * Writes reports/shots/<engine>/*.png.
 */
import { test } from '@playwright/test';

test('boot screen', async ({ page }, info) => {
  await page.goto('/');
  await page.locator('html[data-boot="ok"]').waitFor();
  await page.screenshot({ path: `reports/shots/${info.project.name}/boot.png` });
});
