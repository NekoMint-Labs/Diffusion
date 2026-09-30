import { test, expect, type Page } from '@playwright/test';

async function ask(page: Page) {
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
    await expect(page.getByTestId('speak').locator('textarea')).toBeFocused();
}

async function noticeGap(page: Page) {
    const notice = await page.locator('.notice').boundingBox();
    const speak = await page.getByTestId('speak').boundingBox();
    return notice && speak ? notice.y - (speak.y + speak.height) : -1;
}

for (const scale of [1, 1.25, 1.5]) {
    test.describe(`Chinese feedback at browser device scale ${scale}`, () => {
        test.use({ deviceScaleFactor: scale, viewport: { width: 1024, height: 768 }, reducedMotion: scale === 1.5 ? 'reduce' : 'no-preference' });
        test('AI-off notice avoids the draft, clears on settings and can be shown again', async ({ page }, testInfo) => {
            await page.addInitScript(dark => {
                localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'off', appearance: { profile: dark ? 'graphite-night' : 'editorial-warm' } }));
            }, scale === 1.5);
            await page.goto('/demo?locale=zh');
            await ask(page);
            const draft = '保留这段尚未发送的中文问题\n第二行仍需要继续思考\n第三行用于验证输入区域变高';
            const editor = page.getByTestId('speak').locator('textarea');
            await editor.fill(draft);
            await editor.press('Enter');
            await expect(page.getByTestId('notice-action')).toBeVisible();
            await expect(editor).toHaveValue(draft);
            await expect.poll(() => noticeGap(page)).toBeGreaterThanOrEqual(12);
            const wideNoticeHeight = (await page.locator('.notice').boundingBox())!.height;
            await page.setViewportSize({ width: 640, height: 600 });
            await expect.poll(() => noticeGap(page)).toBeGreaterThanOrEqual(12);
            await page.screenshot({ path: testInfo.outputPath('notice-and-draft.png') });
            await page.setViewportSize({ width: 360, height: 600 });
            await expect.poll(async () => (await page.locator('.notice').boundingBox())!.height).toBeGreaterThan(wideNoticeHeight);
            await expect.poll(() => noticeGap(page)).toBeGreaterThanOrEqual(12);
            await page.screenshot({ path: testInfo.outputPath('wrapped-notice-and-draft.png') });
            await page.getByTestId('notice-action').click();
            await expect(page.locator('#setting-ai')).toBeVisible();
            await expect(page.locator('.notice')).toHaveCount(0);
            await page.locator('[role="dialog"] .surface-close').click();
            await page.setViewportSize({ width: 1024, height: 768 });
            await ask(page);
            await expect(editor).toHaveValue(draft);
            await editor.press('Enter');
            await expect(page.getByTestId('notice-action')).toBeVisible();
            await expect.poll(() => noticeGap(page)).toBeGreaterThanOrEqual(12);
        });
    });
}

test('opening settings leaves a persistent storage failure and its Export action visible', async ({ page }) => {
    await page.addInitScript(() => {
        const put = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
            if (this.name === 'projects') throw new DOMException('Save unavailable for regression test', 'QuotaExceededError');
            return Reflect.apply(put, this, args);
        };
    });
    await page.goto('/?locale=en');
    const notice = page.locator('.notice');
    await expect(notice).toHaveAttribute('data-tone', 'error');
    await expect(notice.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
    await page.keyboard.press('Control+,');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await expect(notice).toHaveAttribute('data-tone', 'error');
    await expect(notice.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
});
