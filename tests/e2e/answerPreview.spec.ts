import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';
import { answerPreview, ANSWER_PREVIEW_LIMIT } from '../../src/shared/answerPreview.ts';

const answer = '\u9700\u6c42\u4ecd\u5f85\u9a8c\u8bc1\uff0c\u5148\u7528\u4eba\u5de5\u7d22\u5f15\u505a\u5c0f\u8303\u56f4\u8bd5\u70b9\u3002\n\n' + '\u89c2\u5bdf\u5b66\u751f\u80fd\u5426\u627e\u5230\u8d44\u6599\uff0c\u5e76\u8bb0\u5f55\u4e0d\u4f7f\u7528\u7684\u5177\u4f53\u539f\u56e0\uff1b\u4e0d\u8981\u628a\u6ca1\u6709\u6253\u5f00\u76f4\u63a5\u5f52\u56e0\u4e3a\u9700\u6c42\u4e0d\u8db3\u3002'.repeat(5) + '\u8be6\u7ec6\u56de\u7b54\u672b\u5c3e\u3002';

async function saved(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result, read = db.transaction('projects').objectStore('projects').get('main');
            read.onsuccess = () => { db.close(); resolve(read.result); };
            read.onerror = () => { db.close(); reject(read.error); };
        };
    }));
}
async function boot(page: Page, theme: 'light' | 'dark') {
    await page.addInitScript(theme => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'gateway', locale: 'zh', theme, appearance: { profile: theme === 'dark' ? 'graphite-night' : 'editorial-warm' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, theme);
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', '\u56de\u7b54\u9884\u89c8\u56de\u5f52');
    project.thoughts.source = makeThought('\u5982\u4f55\u9a8c\u8bc1\u5b66\u4e60\u8d44\u6599\u5de5\u5177\u662f\u5426\u503c\u5f97\u505a\uff1f', { x: 300, y: 180 }, 1, 'source');
    await page.evaluate(project => new Promise<void>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onsuccess = () => {
            const db = opening.result, tx = db.transaction('projects', 'readwrite');
            tx.objectStore('projects').put(project);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        };
        opening.onerror = () => reject(opening.error);
    }), project);
    await page.reload();
    await expect(page.locator('[data-thought-id="source"]')).toBeVisible();
}

for (const theme of ['light', 'dark'] as const) test(`Field previews are bounded while read, Keep and continuation retain the full answer: ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const packets: { scope: { id: string; text: string }[] }[] = [];
    await page.route('**/api/respond', route => {
        packets.push(route.request().postDataJSON().packet);
        return route.fulfill({ json: { providerLabel: 'Answer preview fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text: packets.length === 1 ? answer : '\u5148\u786e\u8ba4\u8bd5\u70b9\u7684\u8d44\u6599\u662f\u5426\u9f50\u5168\u3002' }] } });
    });
    await boot(page, theme);
    const before = await saved(page);
    await page.locator('[data-thought-id="source"]').click();
    await page.getByTestId('scope-continue').click();
    await page.getByTestId('action-preview-run').click();
    const ghost = page.locator('article.ghost');
    await expect(ghost).toHaveCount(1);
    await expect(ghost.locator('.thought-preview')).toHaveText(answerPreview(answer));
    expect(Array.from(await ghost.locator('.thought-preview').innerText()).length).toBeLessThanOrEqual(ANSWER_PREVIEW_LIMIT);
    await ghost.click();
    const id = (await ghost.getAttribute('data-thought-id'))!;
    const camera = await page.locator('.world').getAttribute('style');
    await page.screenshot({ path: info.outputPath('field-preview-' + theme + '.png') });
    await ghost.getByRole('button', { name: '\u9605\u8bfb\u5168\u6587', exact: true }).click();
    await expect(page.locator('.thought-reader-text')).toHaveText(answer);
    expect((await saved(page)).thoughts[id]).toBeUndefined();
    await page.locator('.thought-reader .surface-close').click();
    await expect(page.locator('.world')).toHaveAttribute('style', camera!);
    await ghost.click();
    await page.getByTestId('ai-proposal-keep').click();
    await expect.poll(async () => (await saved(page)).thoughts[id]?.text).toBe(answer);
    const source = (await saved(page)).thoughts.source;
    expect({ id: source.id, text: source.text, x: source.x, y: source.y, kind: source.kind }).toEqual({ id: before.thoughts.source.id, text: before.thoughts.source.text, x: before.thoughts.source.x, y: before.thoughts.source.y, kind: before.thoughts.source.kind });
    await page.reload();
    await page.locator(`[data-thought-id="${id}"]`).click();
    await page.getByTestId('scope-continue').click();
    await page.getByTestId('action-preview-run').click();
    await expect.poll(() => packets.length).toBe(2);
    expect(packets[1].scope.find(item => item.id === id)?.text).toBe(answer);
});

test('Thread folds long AI detail and keeps user wording and stored history complete', async ({ page }, info) => {
    await boot(page, 'light');
    await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Thread preview fixture / not live', mock: true, intents: [{ type: 'respond_in_field', text: answer }] } }));
    await page.locator('[data-thought-id="source"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="thread"]').click();
    const thread = page.locator('.surface.split');
    await thread.locator('textarea').fill('\u8bf7\u5e2e\u6211\u5224\u65ad\u5148\u9a8c\u8bc1\u4ec0\u4e48\u3002');
    await thread.locator('button[type="submit"]').click();
    await expect(thread.getByTestId('answer-preview')).toHaveText(answerPreview(answer));
    const full = thread.getByTestId('answer-full-text');
    await expect(full).not.toBeVisible();
    await expect.poll(async () => Object.values((await saved(page)).threads)[0]?.messages.at(-1)?.text).toBe(answer);
    const before = await saved(page);
    await page.screenshot({ path: info.outputPath('thread-preview.png') });
    await thread.getByText('\u9605\u8bfb\u5168\u6587', { exact: true }).click();
    await expect(full).toBeVisible();
    await expect(full).toContainText('\u8be6\u7ec6\u56de\u7b54\u672b\u5c3e');
    expect((await saved(page)).threads).toEqual(before.threads);
    await thread.getByText('\u9605\u8bfb\u5168\u6587', { exact: true }).click();
    await expect(full).not.toBeVisible();
});

test('Suggestions disclose the full answer from a bounded preview without accepting it', async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page, 'dark');
    await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Suggestion preview fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text: answer }] } }));
    await page.locator('[data-thought-id="source"]').click();
    await page.getByTestId('scope-continue').click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.locator('article.ghost')).toHaveCount(1);
    await page.mouse.move(100, 300);
    await page.keyboard.down('Control');
    for (let i = 0; i < 15; i++) {
        if (await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a) <= .17) break;
        await page.mouse.wheel(0, 60);
        await page.waitForTimeout(100);
    }
    await page.keyboard.up('Control');
    await page.getByTestId('suggestion-review-toggle').click();
    const panel = page.getByTestId('suggestion-review-panel');
    await expect(panel.getByTestId('answer-preview')).toHaveText(answerPreview(answer));
    const full = panel.getByTestId('answer-full-text');
    await expect(full).not.toBeVisible();
    await page.screenshot({ path: info.outputPath('suggestion-preview-dark.png') });
    await panel.getByText('\u9605\u8bfb\u5168\u6587', { exact: true }).click();
    await expect(full).toBeVisible();
    await expect(full).toContainText('\u8be6\u7ec6\u56de\u7b54\u672b\u5c3e');
    expect(Object.keys((await saved(page)).thoughts)).toEqual(['source']);
    await panel.getByTestId('suggestion-keep').click();
    await expect.poll(async () => Object.values((await saved(page)).thoughts).some(thought => thought.text === answer)).toBe(true);
});
