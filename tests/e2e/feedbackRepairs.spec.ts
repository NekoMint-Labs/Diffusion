import { test, expect, type Page } from '@playwright/test';

async function prepare(page: Page, zoomed = false) {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'gateway' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Controlled fixture', mock: false, intents: [{ type: 'surface_possibility', text: '希望能支持按课程分类希望能支持按课程分类课程' }] } }));
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
    if (zoomed) {
        await page.mouse.move(700, 400);
        for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(40); }
        await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
        await expect(page.getByTestId('field')).not.toHaveAttribute('data-camera-moving', 'true');
    }
    await page.getByTestId('field').dblclick({ position: { x: 460, y: 300 } });
    await page.locator('.thought.editing textarea').fill('希望能支持按课程分类');
    await page.locator('.thought.editing textarea').press('Enter');
}
async function generate(page: Page) {
    await page.getByTestId('scope-continue').click();
    await page.getByTestId('action-preview-run').click();
}

test('Atlas offers readable pending suggestions without manual zoom', async ({ page }, info) => {
    await prepare(page, true);
    const camera = await page.locator('.world').getAttribute('style');
    await generate(page);
    await expect(page.getByTestId('suggestion-review-toggle')).toBeVisible();
    await page.getByTestId('suggestion-review-toggle').click();
    const review = page.getByTestId('suggestion-review');
    await expect(review).toContainText('希望能支持按课程分类希望能支持按课程分类课程');
    expect(await page.locator('.world').getAttribute('style')).toBe(camera);
    await page.screenshot({ path: info.outputPath('atlas-results.png') });
    await review.getByTestId('suggestion-keep').first().click();
    await expect(page.locator('article.ghost')).toHaveCount(0);
    await expect(page.locator('article.thought').filter({ hasText: '希望能支持按课程分类希望能支持按课程分类课程' })).toBeVisible();
});

test('scope overflow keeps its measured trigger for click hover and keyboard', async ({ page }, info) => {
    await prepare(page);
    const trigger = page.getByTestId('thought-more');
    for (const mode of ['hover', 'click', 'keyboard']) {
        const before = (await trigger.boundingBox())!;
        if (mode === 'hover') await trigger.hover();
        else if (mode === 'click') await trigger.click();
        else { await trigger.focus(); await trigger.press('Enter'); }
        const menu = page.getByTestId('thought-menu');
        await expect(menu).toBeVisible();
        await expect(trigger).toBeVisible();
        const box = (await menu.boundingBox())!;
        expect(Math.min(Math.abs(box.x - before.x - before.width), Math.abs(box.x + box.width - before.x))).toBeLessThan(30);
        expect(Math.abs(box.y - before.y)).toBeLessThan(60);
        await menu.hover();
        await page.screenshot({ path: info.outputPath(`menu-${mode}.png`) });
        await page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
        await expect(trigger).toBeFocused();
    }
});

test('Ghost dismissal has a reserved area separate from text and selection', async ({ page }, info) => {
    await prepare(page);
    await generate(page);
    const ghost = page.locator('article.ghost').first();
    await expect(ghost).toBeVisible();
    const width = (await ghost.locator('.thought-preview').boundingBox())!.width;
    await ghost.click();
    const overlaps = await ghost.evaluate(el => {
        const button = el.querySelector('.proposal-reject')!.getBoundingClientRect();
        const text = el.querySelector('.thought-preview')!.getBoundingClientRect();
        const dot = el.querySelector('.thought-selected-dot')!.getBoundingClientRect();
        const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        return intersects(button, text) || intersects(button, dot);
    });
    expect(overlaps).toBe(false);
    expect((await ghost.locator('.thought-preview').boundingBox())!.width).toBeCloseTo(width, 1);
    await page.screenshot({ path: info.outputPath('ghost-controls.png') });
    await ghost.locator('.proposal-reject').click();
    await expect(ghost).toHaveCount(0);
    await expect(page.locator('article.thought')).toHaveCount(1);
});
