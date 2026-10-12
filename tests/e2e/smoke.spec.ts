/**
 * Wave 0 smoke test (architect). Owner from Wave 2: qa-engineer.
 */
import { expect, test } from '@playwright/test';

test('boots the dev page and loads both inlined fonts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveTitle("Ellie's Place");
  await expect(page.locator('html')).toHaveAttribute('data-boot', 'ok');
  const fonts = await page.evaluate(async () => {
    await document.fonts.load('16px "Pixelify Sans"');
    await document.fonts.load('16px "IM Fell English"');
    return {
      pixel: document.fonts.check('16px "Pixelify Sans"'),
      fell: document.fonts.check('16px "IM Fell English"'),
    };
  });
  expect(fonts).toEqual({ pixel: true, fell: true });
  expect(errors).toEqual([]);
});
