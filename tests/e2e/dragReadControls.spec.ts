import { test, expect } from '@playwright/test';

for (const cancelled of [false, true]) {
    test(`reading controls follow the live drag and ${cancelled ? 'cancellation' : 'drop'}`, async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.addInitScript(() => {
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        });
        await page.goto('/demo?locale=zh');
        await expect(page.getByTestId('field')).toBeVisible();
        await page.getByTestId('field').dblclick({ position: { x: 1350, y: 300 } });
        const editor = page.locator('.thought.editing textarea');
        await editor.fill('拖动卡片时，阅读全文和回应按钮应该同步移动。'.repeat(20));
        await editor.press('Enter');
        const card = page.locator('.thought[data-selected="true"]');
        const actions = card.locator('.thought-local-actions');
        await expect(actions).toBeVisible();
        await expect(actions).not.toHaveAttribute('data-docked', 'true');
        const before = (await card.boundingBox())!;
        const start = { x: before.x + 30, y: before.y + 25 };
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        for (const offset of [75, 150]) {
            await page.mouse.move(start.x + offset, start.y + offset, { steps: 5 });
            await expect.poll(async () => {
                const bounds = (await card.boundingBox())!;
                const strip = (await actions.boundingBox())!;
                return Math.abs(strip.x - bounds.x) < 2 && Math.abs(strip.y - bounds.y - bounds.height - 7) < 2;
            }, { timeout: 2500 }).toBe(true);
        }
        if (cancelled) await page.getByTestId('field').dispatchEvent('pointercancel', { pointerId: 1 });
        await page.mouse.up();
        await expect.poll(async () => {
            const bounds = (await card.boundingBox())!;
            const strip = (await actions.boundingBox())!;
            return Math.abs(strip.x - bounds.x) < 2 && Math.abs(strip.y - bounds.y - bounds.height - 7) < 2;
        }).toBe(true);
        if (cancelled) expect((await card.boundingBox())!.x).toBeCloseTo(before.x, 0);
        await card.locator('.thought-read').click();
        await expect(page.locator('.thought-reader-text')).toContainText('拖动卡片时');
    });
}
