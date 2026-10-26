import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';
const question = '我想做一个面向大学生的 AI 学习工具，请先找出最值得验证的问题，不要给完整开发方案。';
const condition = '如果学生不愿参与，也可能是隐私顾虑，不能直接说明没有需求。';
const answer = '先验证学生会不会为这个工具改变现在的做法。\n\n在每周只有四小时、先做小范围验证的条件下，可以围绕一次真实作业观察对方是否愿意尝试。暂时不开发完整产品。' + condition + '保留每次反应的具体原因，再判断是否值得进入下一步。';
const point = '仅在学生同意分享时，用四小时观察一次作业辅助；拒绝参与不能直接说明没有需求。';
const focus = { point, conditions: [condition], highlights: [condition] };
async function saved(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => { const db = opening.result; const read = db.transaction('projects').objectStore('projects').get('main'); read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => { db.close(); reject(read.error); }; };
    }));
}
async function boot(page: Page, theme: 'light' | 'dark' = 'light', text = answer, reading: unknown = { point }) {
    const calls = { primary: 0, manual: 0, respond: 0 };
    const contexts: { scope: { id: string; text: string }[] }[] = [];
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(theme => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ provider: 'gateway', locale: 'zh', theme, appearance: { profile: theme === 'dark' ? 'graphite-night' : 'editorial-warm' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, theme);
    await page.route('**/api/structured', route => {
        const input = route.request().postDataJSON().input;
        if (input.context) {
            calls.primary++; contexts.push(input.context);
            return route.fulfill({ json: { value: { intents: [{ type: 'surface_possibility', text, ...(reading === null ? {} : { reading }) }] }, mock: false, providerLabel: 'Injected generation fixture, not live' } });
        }
        calls.manual++;
        return route.fulfill({ json: { value: focus, mock: false, providerLabel: 'Injected manual fixture, not live' } });
    });
    await page.route('**/api/respond', route => { calls.respond++; return route.fulfill({ json: { providerLabel: 'Unexpected respond fixture', mock: false, intents: [] } }); });
    await page.goto('/?locale=zh&readingTrial=1'); await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', '重点原界面试用，人工注入模型响应');
    project.thoughts.question = makeThought(question, { x: 300, y: 180 }, 1, 'question');
    await page.evaluate(project => new Promise<void>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onsuccess = () => { const db = opening.result; const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; };
    }), project);
    await page.reload(); await page.locator('[data-thought-id="question"]').click();
    await page.getByTestId('scope-continue').click(); await page.getByTestId('action-preview-run').click();
    const ghost = page.locator('article.ghost'); await expect(ghost).toHaveCount(1);
    return { ghost, calls, contexts };
}
async function read(page: Page) {
    const ghost = page.locator('article.ghost'); await ghost.click();
    await ghost.getByRole('button', { name: '阅读原文', exact: true }).click();
    const reader = page.locator('.thought-reader'); await expect(reader.getByTestId('reading-original')).toBeVisible();
    return reader;
}
for (const theme of ['light', 'dark'] as const) test('one call, point-only card, complete reader and full-text Keep/Continue: ' + theme, async ({ page }, info) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const { ghost, calls, contexts } = await boot(page, theme);
    await expect(ghost).toHaveAttribute('data-reading-focus', 'true');
    await expect(ghost.locator('.thought-preview')).toHaveText(point);
    await expect(ghost.locator('.thought-preview')).not.toContainText(condition);
    expect(calls).toEqual({ primary: 1, manual: 0, respond: 0 });
    await ghost.click(); await page.screenshot({ path: info.outputPath('compact-card-' + theme + '.png') });
    const reader = await read(page);
    await expect(reader.getByTestId('reading-original')).toHaveText(answer);
    await expect(reader.getByTestId('reading-focus-point')).toBeHidden();
    await expect(reader.getByTestId('reading-focus-run')).toHaveCount(0);
    const context = reader.locator('.focus-reading-context'); await expect(context.locator('p')).toBeHidden();
    await context.locator('summary').click(); await expect(context.locator('p')).toHaveText(question);
    await context.locator('summary').click();
    await reader.getByText('卡片重点', { exact: true }).click(); await expect(reader.getByTestId('reading-focus-point')).toHaveText(point);
    await reader.getByText('卡片重点', { exact: true }).click();
    expect(calls).toEqual({ primary: 1, manual: 0, respond: 0 });
    const box = (await reader.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(1281);
    await page.screenshot({ path: info.outputPath('original-reader-' + theme + '.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    const narrow = (await reader.boundingBox())!; expect(narrow.x).toBeGreaterThanOrEqual(0); expect(narrow.x + narrow.width).toBeLessThanOrEqual(391);
    expect(await reader.locator('.surface-body').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath('original-reader-narrow-' + theme + '.png') });
    await reader.locator('.surface-close').click(); await page.setViewportSize({ width: 1280, height: 900 });
    await ghost.click(); const id = (await ghost.getAttribute('data-thought-id'))!;
    await page.getByTestId('ai-proposal-keep').click();
    await expect.poll(async () => (await saved(page)).thoughts[id]?.text).toBe(answer);
    const kept = page.locator('[data-thought-id="' + id + '"]'); await expect(kept.locator('.thought-preview')).toHaveText(point);
    await kept.click(); await kept.getByRole('button', { name: '阅读原文', exact: true }).click();
    await expect(page.getByTestId('reading-original')).toHaveText(answer);
    await page.locator('.thought-reader .surface-close').click();
    await kept.click(); await page.getByTestId('scope-continue').click(); await page.getByTestId('action-preview-run').click();
    await expect.poll(() => calls.primary).toBe(2);
    expect(contexts[1].scope.find(item => item.id === id)?.text).toBe(answer);
    expect(calls.manual).toBe(0); expect(calls.respond).toBe(0);
    await page.reload(); await expect(kept).not.toHaveAttribute('data-reading-focus', 'true');
    expect((await saved(page)).thoughts[id].text).toBe(answer); expect(errors).toEqual([]);
});
for (const theme of ['light', 'dark'] as const) test('already-short answer is fully shown with no summary label or additional request: ' + theme, async ({ page }, info) => {
    const short = '每周四小时内，先观察一次学生实际使用；未参与也可能出于隐私顾虑。';
    const { ghost, calls } = await boot(page, theme, short);
    await expect(ghost.locator('.thought-preview')).toHaveText(short);
    await expect(ghost).toHaveAttribute('data-compact-original', 'true');
    await expect(ghost).not.toHaveAttribute('data-reading-focus', 'true');
    await expect(ghost.locator('.reading-focus-card-label')).toHaveCount(0);
    expect(calls).toEqual({ primary: 1, manual: 0, respond: 0 });
    await ghost.click();
    const id = (await ghost.getAttribute('data-thought-id'))!;
    await ghost.getByRole('button', { name: '阅读原文', exact: true }).click();
    await expect(page.getByTestId('reading-original')).toHaveText(short);
    await page.locator('.thought-reader .surface-close').click();
    await ghost.click(); await page.getByTestId('ai-proposal-keep').click();
    const kept = page.locator('[data-thought-id="' + id + '"]');
    await expect.poll(async () => (await saved(page)).thoughts[id]?.text).toBe(short);
    for (const reloaded of [false, true]) {
        if (reloaded) await page.reload();
        await kept.click();
        const readButton = kept.getByRole('button', { name: '阅读原文', exact: true });
        await expect(readButton).toBeVisible();
        // Keyboard activation also verifies the top-layer button remains reachable after Keep.
        await readButton.focus(); await page.keyboard.press('Enter');
        await expect(page.getByTestId('reading-original')).toBeVisible();
        await expect(page.getByTestId('reading-original')).toHaveText(short);
        await expect(page.getByTestId('reading-focus-run')).toHaveCount(0);
        await page.locator('.thought-reader .surface-close').click();
    }
    await kept.click();
    await page.screenshot({ path: info.outputPath('short-kept-reader-entry-' + theme + '.png') });
    expect(calls).toEqual({ primary: 1, manual: 0, respond: 0 });
});
test('invalid display metadata preserves the answer; only an explicit manual extraction adds a call', async ({ page }) => {
    const { ghost, calls } = await boot(page, 'light', answer, { point: '过长'.repeat(121) });
    expect(calls.primary).toBe(1); expect(calls.manual).toBe(0);
    await expect(ghost).not.toHaveAttribute('data-reading-focus', 'true');
    await expect(ghost.locator('.reading-focus-card-label')).toHaveText('正文预览 · 尚未提炼');
    const reader = await read(page); await expect(reader.getByTestId('reading-original')).toHaveText(answer);
    await reader.getByTestId('reading-focus-run').click(); await expect.poll(() => calls.manual).toBe(1);
    await reader.locator('.surface-close').click(); await expect(ghost.locator('.thought-preview')).toHaveText(point);
    expect(calls.primary).toBe(1);
});
test('closing the reader discards a late manual result', async ({ page }) => {
    const { ghost, calls } = await boot(page, 'light', answer, null);
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let manual = 0;
    await page.route('**/api/structured', async route => {
        manual++; await gate;
        try { await route.fulfill({ json: { value: focus, mock: false, providerLabel: 'Late fixture' } }); } catch { /* Request already cancelled. */ }
    });
    const reader = await read(page); await reader.getByTestId('reading-focus-run').click(); await expect.poll(() => manual).toBe(1);
    await reader.locator('.surface-close').click(); release();
    await expect(reader).not.toBeVisible();
    const reopened = await read(page); await expect(reopened.getByTestId('reading-focus-point')).toHaveCount(0);
    await expect(reopened.getByTestId('reading-original')).toHaveText(answer);
    await expect(ghost).not.toHaveAttribute('data-reading-focus', 'true'); expect(calls.primary).toBe(1);
});
