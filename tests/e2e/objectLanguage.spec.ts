import { test, expect, type Page } from '@playwright/test';
import type { ProjectState } from '../../src/core/model.ts';

async function saved(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const read = db.transaction('projects').objectStore('projects').get('demo');
            read.onsuccess = () => { db.close(); resolve(read.result); };
            read.onerror = () => { db.close(); reject(read.error); };
        };
    }));
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    test.describe(`object ownership with ${reducedMotion} motion`, () => {
        test.use({ viewport: { width: 1280, height: 720 }, reducedMotion });
        test('Keep changes material in place; Ignore and reload never silently commit suggestions', async ({ page }, testInfo) => {
            await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'demo', locale: 'zh' })));
            await page.goto('/demo?locale=zh');
            await page.locator('[data-thought-id="attention"]').click();
            await page.getByTestId('scope-continue').click();
            await page.getByTestId('action-preview-run').click();
            const first = page.locator('article.ghost').first();
            await expect(first).toBeVisible();
            const id = (await first.getAttribute('data-thought-id'))!;
            const target = page.locator(`[data-thought-id="${id}"]`);
            await expect(target.locator('.ghost-label')).toHaveText('AI 建议 · 尚未保留');
            expect((await saved(page)).thoughts[id]).toBeUndefined();
            await target.locator('.thought-preview').click();
            await expect(target).toHaveAttribute('data-selected', 'true');
            const before = await target.evaluate(el => (el as HTMLElement).style.transform);
            await page.screenshot({ path: testInfo.outputPath('proposed.png') });
            await page.getByTestId('ai-proposal-keep').click();
            await expect(target).toHaveAttribute('data-kind', 'thought');
            await expect(target.locator('.ghost-label')).toHaveCount(0);
            expect(await target.evaluate(el => (el as HTMLElement).style.transform)).toBe(before);
            await expect.poll(async () => Boolean((await saved(page)).thoughts[id])).toBe(true);
            const committed = (await saved(page)).thoughts[id];
            await page.keyboard.press('Control+z');
            await expect.poll(async () => Boolean((await saved(page)).thoughts[id])).toBe(false);
            await page.keyboard.press('Control+Shift+z');
            await expect.poll(async () => (await saved(page)).thoughts[id]).toEqual(committed);
            await expect(target).toHaveAttribute('data-kind', 'thought');
            // DOM order is not visibility order: a clipped edge card's visible center can be
            // its remove button. Select an unobstructed on-screen proposal's actual content.
            let ignoredId = '';
            await expect.poll(async () => {
                ignoredId = await page.locator('article.ghost').evaluateAll(elements => {
                    const field = document.querySelector('[data-testid="field"]')!.getBoundingClientRect();
                    const proposal = elements.find(element => {
                        const content = element.querySelector('.thought-preview')!.getBoundingClientRect();
                        const centerX = content.x + content.width / 2, centerY = content.y + content.height / 2;
                        return content.x >= field.x && content.y >= field.y
                            && content.right <= field.right && content.bottom <= field.bottom
                            && document.elementFromPoint(centerX, centerY)?.closest('article.ghost') === element;
                    });
                    return proposal?.getAttribute('data-thought-id') ?? '';
                });
                return ignoredId;
            }).not.toBe('');
            const ignored = page.locator(`[data-thought-id="${ignoredId}"]`);
            await ignored.locator('.thought-preview').click();
            await expect(ignored).toHaveAttribute('data-selected', 'true');
            await expect(ignored).toHaveAttribute('data-kind', 'ghost');
            expect((await saved(page)).thoughts[ignoredId]).toBeUndefined();
            await page.getByTestId('ai-proposal-ignore').click();
            await expect(page.locator(`[data-thought-id="${ignoredId}"]`)).toHaveCount(0);
            expect((await saved(page)).thoughts[ignoredId]).toBeUndefined();
            await page.reload();
            await expect(target).toHaveAttribute('data-kind', 'thought');
            expect((await saved(page)).thoughts[id]).toEqual(committed);
            await expect(page.locator('article.ghost')).toHaveCount(0);
            await page.screenshot({ path: testInfo.outputPath('kept.png') });
        });
    });
}
