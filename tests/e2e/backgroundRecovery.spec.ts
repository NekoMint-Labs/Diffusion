import { test, expect } from '@playwright/test';

test('a failed optional background still permits reading and responding in the Field', async ({ page }, testInfo) => {
    await page.addInitScript(() => localStorage.removeItem('diffusion-e2e-background'));
    await page.route('**/assets/PaperTextureBackground-*.js', route => route.abort());
    await page.goto('/demo?locale=en');
    await expect(page.locator('[data-background-fallback="true"]')).toBeVisible();
    await expect(page.locator('[data-thought-id="unfinished"]')).toBeVisible();
    await page.locator('[data-thought-id="unfinished"]').click();
    await page.getByRole('button', { name: 'Respond to this question', exact: true }).click();
    await page.getByRole('textbox', { name: 'Speak', exact: true }).fill('The Field remains usable without its optional background.');
    await expect(page.getByRole('button', { name: 'Save response', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('background-fallback.png') });
});
