import { test, expect } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';

for (const entry of ['direct', 'reader'] as const) {
    test(`a docked reading strip clears the ${entry} response composer`, async ({ page }) => {
        await page.setViewportSize({ width: 1434, height: 870 });
        await page.addInitScript(() => {
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        });
        await page.goto('/?locale=zh');
        await expect(page.getByTestId('field')).toBeVisible();
        const project = createProject('main', 'C-正常目录验收-20261026（合成资料） (restored)');
        const parent = makeThought('NORMAL-PARENT：这是一段专供本地验收的合成资料。' + '先记录事实，再检查假设，最后留下需要继续思考的问题。'.repeat(25), { x: 150, y: 100 }, 1, 'parent');
        project.thoughts.parent = parent;
        project.thoughts.response = { ...makeThought('NORMAL-BASE-RESPONSE：这条本地回应用于核对原文和来源关系。', { x: 500, y: 200 }, 1, 'response'), derivedFrom: ['parent'], generationAction: 'continue' };
        await page.evaluate(project => new Promise<void>((resolve, reject) => {
            const opening = indexedDB.open('diffusion-explorer-v1');
            opening.onerror = () => reject(opening.error);
            opening.onsuccess = () => {
                const db = opening.result;
                const tx = db.transaction('projects', 'readwrite');
                tx.objectStore('projects').put(project);
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = () => { db.close(); reject(tx.error); };
                tx.onabort = () => { db.close(); reject(tx.error); };
            };
        }), project);
        await page.reload();
        const card = page.locator('[data-thought-id="parent"]');
        await card.click();
        const strip = card.locator('.thought-local-actions');
        await expect(strip).toHaveAttribute('data-docked', 'true');
        const before = await card.boundingBox();
        if (entry === 'reader') {
            await strip.getByRole('button', { name: '阅读全文', exact: true }).click();
            await page.getByRole('dialog').getByRole('button', { name: '补充我的想法', exact: true }).click();
        } else {
            await strip.getByRole('button', { name: '补充我的想法', exact: true }).click();
        }
        const input = page.getByRole('textbox', { name: '说点什么', exact: true });
        await expect(input).toBeFocused();
        const draft = 'DOCKED-RESPONSE：阅读操作停靠在底部时，回应输入框也需要保留独立空间。'.repeat(4);
        await input.fill(draft);
        await expect.poll(async () => {
            const row = (await strip.boundingBox())!;
            const composer = (await page.getByTestId('speak').boundingBox())!;
            return composer.y + composer.height <= row.y - 8;
        }).toBe(true);
        await expect(input).toHaveValue(draft);
        expect(await card.boundingBox()).toEqual(before);
        await page.getByRole('button', { name: '保存回应', exact: true }).click();
        const reply = page.locator('article.thought').filter({ has: page.locator('p', { hasText: draft.slice(0, 30) }) });
        await expect(reply).toHaveAttribute('data-origin-scope', 'parent');
        await expect(card.locator('p')).toHaveText(parent.text);
    });
}
