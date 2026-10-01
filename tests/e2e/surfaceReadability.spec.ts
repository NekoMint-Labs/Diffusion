import { test, expect, type Page, type Locator } from '@playwright/test';

async function readable(page: Page, surface: Locator) {
    await expect(surface).toBeVisible();
    const viewport = page.viewportSize()!;
    const box = (await surface.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await surface.locator('.surface-body').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    const close = surface.locator('.surface-close');
    await expect(close).toBeVisible();
    expect(await close.evaluate(el => {
        const b = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
    }), 'the return control remains reachable above scrolling content').toBe(true);
    const clipped = await surface.locator('.ui-button').evaluateAll(buttons => buttons.filter(el => el.getClientRects().length && el.scrollWidth > el.clientWidth + 1).map(el => el.textContent));
    expect(clipped, 'action text wraps instead of clipping').toEqual([]);
}

for (const [width, height, locale, profile] of [
    [1280, 720, 'zh', 'editorial-warm'], [1440, 960, 'en', 'graphite-night'],
    [1920, 1080, 'zh', 'graphite-night'], [1024, 576, 'zh', 'graphite-night'], [853, 480, 'zh', 'editorial-warm'],
] as const) {
    test.describe(`${locale} surfaces at ${width}x${height}`, () => {
        test.use({ viewport: { width, height }, reducedMotion: 'reduce' });
        test('settings, Find, History, Thread and Deep Dive keep readable controls and a return path', async ({ page }, testInfo) => {
            await page.addInitScript(({ locale, profile }) => localStorage.setItem('diffusion-settings', JSON.stringify({ locale, provider: 'off', interfaceSize: 120, appearance: { profile } })), { locale, profile });
            await page.goto(`/demo?locale=${locale}`);
            const thought = page.locator('[data-thought-id="attention"]');
            await expect(thought).toBeVisible();
            await page.keyboard.press('Control+,');
            const settings = page.locator('.settings-surface[role="dialog"]');
            for (const section of ['general', 'appearance', 'ai', 'search']) {
                await settings.locator(`[data-section="${section}"]`).click();
                await readable(page, settings);
                const alignment = await settings.evaluate(el => {
                    const textBottom = (node: Element) => {
                        const range = document.createRange();
                        range.selectNodeContents(node);
                        return range.getBoundingClientRect().bottom;
                    };
                    return Math.abs(textBottom(el.querySelector('.settings-nav-tab')!) - textBottom(el.querySelector('[role="tabpanel"] > h3')!));
                });
                expect(alignment, 'each section title aligns with the first navigation label').toBeLessThanOrEqual(2);
                await page.screenshot({ path: testInfo.outputPath(`settings-${section}.png`) });
            }
            await settings.locator('.surface-close').click();
            await page.keyboard.press('Control+f');
            const find = page.locator('.find-bar[role="dialog"]');
            await find.locator('input').fill('这是一段没有匹配内容的很长的中文检索词句'.repeat(4));
            await readable(page, find);
            await expect(find.locator('.find-hint')).toContainText(locale === 'zh' ? '试试更短的词句' : 'Try a shorter phrase');
            await page.screenshot({ path: testInfo.outputPath('find.png') });
            await page.keyboard.press('Escape');
            await thought.dblclick();
            const wording = '这是我还在思考的问题。长中文应该可以完整阅读，不能因为进入讨论而被截断。'.repeat(5);
            await page.locator('.thought.editing textarea').fill(wording);
            await page.locator('.thought.editing textarea').press('Enter');
            await page.keyboard.press('f');
            const camera = await page.locator('.world').evaluate(el => (el as HTMLElement).style.transform);
            await page.getByTestId('thought-more').click();
            await page.getByTestId('thought-menu').locator('[data-command="thread"]').click();
            const thread = page.locator('.surface.split[role="dialog"]');
            await readable(page, thread);
            await expect(thread.locator('.thread-scope')).toHaveText(wording);
            await expect(thread.locator('.surface-empty')).toBeVisible();
            await page.screenshot({ path: testInfo.outputPath('thread.png') });
            await thread.getByRole('button', { name: locale === 'zh' ? '深入一点' : 'Go deeper', exact: true }).click();
            const deep = page.locator('.surface.focus[role="dialog"]');
            await readable(page, deep);
            await expect(deep.locator('.thread-focus-context')).toContainText(wording);
            await page.screenshot({ path: testInfo.outputPath('deep-dive.png') });
            await deep.locator('.surface-close').click();
            await expect(thought).toHaveAttribute('data-selected', 'true');
            await expect.poll(() => page.locator('.world').evaluate(el => (el as HTMLElement).style.transform)).toBe(camera);
            await page.getByTestId('field-title').click();
            const menu = page.getByTestId('field-menu');
            if (!await menu.locator('[data-command="history"]').count()) {
                await menu.locator('[data-command="more"]').click();
                await page.getByTestId('field-more-menu').locator('[data-command="history"]').click();
            } else await menu.locator('[data-command="history"]').click();
            const history = page.locator('.surface.focus[role="dialog"]');
            await readable(page, history);
            await page.screenshot({ path: testInfo.outputPath('history.png') });
            await page.keyboard.press('Escape');
            await expect(page.locator('[role="dialog"]')).toHaveCount(0);
        });
    });
}
