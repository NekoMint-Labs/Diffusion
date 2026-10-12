import { test, expect } from '@playwright/test';

for (const width of [900, 1440]) {
    test(`context menu temporarily hides read controls at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(() => {
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        });
        await page.goto('/demo?locale=zh');
        await expect(page.getByTestId('field')).toBeVisible();
        await page.getByTestId('field').dblclick({ position: { x: width - 280, y: 350 } });
        const editor = page.locator('.thought.editing textarea');
        await editor.fill('右键菜单应当遮住下方的阅读全文操作，关闭菜单后恢复阅读。'.repeat(20));
        await editor.press('Enter');
        const card = page.locator('.thought[data-selected="true"]');
        const read = card.locator('.thought-read');
        await expect(read).toBeVisible();
        const bounds = (await card.boundingBox())!;
        await page.mouse.click(bounds.x + 30, bounds.y + bounds.height - 5, { button: 'right' });
        const menu = page.getByTestId('thought-menu');
        await expect(menu).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('context-menu-reading.png') });
        await expect(read).toBeHidden();
        const item = menu.getByRole('menuitem').first();
        await expect.poll(() => item.evaluate(element => {
            const bounds = element.getBoundingClientRect();
            return element.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
        })).toBe(true);
        await page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
        await expect(read).toBeVisible();
        await read.click();
        await expect(page.locator('.thought-reader-text')).toContainText('右键菜单应当遮住');
    });
}
