import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
const texts = Array.from({ length: 5 }, (_, i) => `第${i + 1}项建议：先观察课程学习中真实出现的困难，记录来源和可验证的证据，再比较不同做法。`.repeat(5));

async function saved(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result, read = db.transaction('projects').objectStore('projects').get('main');
            read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => reject(read.error);
        };
    }));
}
async function boot(page: Page, count: number, theme: 'light' | 'dark', zoom: number, atlas = false) {
    await page.addInitScript(theme => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'gateway', theme, appearance: { profile: theme === 'dark' ? 'graphite-night' : 'editorial-warm' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, theme);
    await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Full viewport fixture / not live', mock: true, intents: texts.slice(0, count).map(text => ({ type: 'surface_possibility', text })) } }));
    await page.goto('/?locale=zh'); await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', '满屏建议阅读回归'); project.camera = { x: 0, y: 0, zoom };
    project.thoughts.source = makeThought('课程学习要怎样安排，才能留下可检验的观察？', { x: 470 / zoom, y: 230 / zoom }, 1, 'source');
    if (atlas) project.thoughts.child = { ...makeThought('总览中的下级想法', { x: 700 / zoom, y: 330 / zoom }, 1, 'child'), organizingParentId: 'source' };
    else for (let row = 0; row < 4; row++) for (let column = 0; column < 4; column++) {
        const id = `fixed-${row}-${column}`;
        project.thoughts[id] = makeThought(`已有思绪${id}：这个位置属于用户，不应因新的建议而移动。`.repeat(8), { x: (column * 320 - 50) / zoom, y: (row * 180 - 40) / zoom }, 1, id);
    }
    await page.evaluate(project => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1'); request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    }), project);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-style-profile', theme === 'dark' ? 'graphite-night' : 'editorial-warm');
    return project;
}
async function toAtlas(page: Page) {
        await page.setViewportSize({ width: 1440, height: 960 });
        await page.mouse.move(100, 400); await page.keyboard.down('Control');
        for (let i = 0; i < 18; i++) {
            const current = await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
            if (current < .18) break; await page.mouse.wheel(0, 60); await page.waitForTimeout(100);
        }
        await page.keyboard.up('Control'); await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
        await expect(page.getByTestId('field')).not.toHaveAttribute('data-camera-moving', 'true');
}
async function generate(page: Page, count: number, expectReview = true) {
    const source = page.locator('[data-thought-id="source"]'); await source.click();
    await page.getByTestId('scope-continue').click();
    if (count !== 1) await page.getByRole('dialog').getByRole('button', { name: String(count), exact: true }).click();
    await page.getByTestId('action-preview-run').click();
    if (expectReview) await expect(page.getByTestId('suggestion-review-toggle')).toBeVisible();
    await expect(page.getByTestId('operation-feedback')).toHaveCount(0);
    await expect.poll(async () => (await saved(page)).thoughts.source.touchedAt).toBeGreaterThan(1);
}

for (const [count, theme, zoom] of [[1, 'light', 1], [3, 'dark', .55], [5, 'light', 1.4]] as const) {
    test(`a genuinely full viewport offers ${count} complete suggestions in ${theme} at zoom ${zoom}`, async ({ page }, info) => {
        await boot(page, count, theme, zoom);
        await generate(page, count);
        const initial = await saved(page);
        const toggle = page.getByTestId('suggestion-review-toggle');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        const entryBox = (await toggle.boundingBox())!; expect(entryBox.width).toBeLessThanOrEqual(200); expect(entryBox.height).toBeGreaterThanOrEqual(36);
        const before = await page.getByTestId('field').boundingBox(), camera = await page.locator('.world').getAttribute('style');
        await page.screenshot({ path: info.outputPath('compact-closed.png') });
        await toggle.click();
        const panel = page.getByTestId('suggestion-review-panel'); await expect(panel).toBeVisible();
        await expect(page.getByTestId('suggestion-review-close')).toBeFocused();
        const size = (await panel.boundingBox())!; expect(size.width).toBeLessThanOrEqual(420); expect(size.height).toBeLessThanOrEqual(320);
        expect(await page.getByTestId('field').boundingBox()).toEqual(before);
        await expect(panel.locator('section')).toHaveCount(count);
        for (const text of texts.slice(0, count)) await expect(panel).toContainText(text);
        await expect(panel).toContainText(initial.thoughts.source.text);
        const scroll = panel.locator('.suggestion-review-list');
        expect(await scroll.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
        await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
        await expect(panel.getByTestId('suggestion-keep').last()).toBeVisible();
        await page.screenshot({ path: info.outputPath('compact-open.png') });
        await panel.getByTestId('suggestion-ignore').last().press('Escape');
        await expect(toggle).toBeFocused(); await expect(panel).toHaveCount(0);
        await expect(page.locator('.world')).toHaveAttribute('style', camera!);
        expect((await saved(page)).thoughts).toEqual(initial.thoughts);
        expect((await saved(page)).relations).toEqual(initial.relations);
    });
}

test('Keep retains a receipt for this session, closes to a usable focus target, and preserves undo/reload', async ({ page }) => {
    await boot(page, 1, 'light', 1); await generate(page, 1); const initial = await saved(page);
    const toggle = page.getByTestId('suggestion-review-toggle'); await toggle.click();
    const section = page.getByTestId('suggestion-review-panel').locator('section').first();
    const id = (await section.getAttribute('data-suggestion-id'))!;
    await section.getByTestId('suggestion-keep').click();
    await expect(section).toHaveAttribute('data-kept', 'true'); await expect(section).toContainText('已留下');
    await expect(section.locator('p')).toHaveText(texts[0]); await expect(section.getByTestId('suggestion-keep')).toHaveCount(0);
    await expect(page.getByTestId('suggestion-review-close')).toBeFocused();
    await expect.poll(async () => !!(await saved(page)).thoughts[id]).toBe(true);
    const kept = (await saved(page)).thoughts[id]; expect(kept.derivedFrom).toContain('source');
    for (const [key, thought] of Object.entries(initial.thoughts)) expect((await saved(page)).thoughts[key]).toEqual(thought);
    await page.getByTestId('suggestion-review-close').click();
    await expect(toggle).toHaveCount(0); await expect(page.getByTestId('field')).toBeFocused();
    await page.keyboard.press('Control+z'); await expect.poll(async () => !!(await saved(page)).thoughts[id]).toBe(false);
    await page.keyboard.press('Control+Shift+z'); await expect.poll(async () => (await saved(page)).thoughts[id]).toEqual(kept);
    await page.reload(); expect((await saved(page)).thoughts[id]).toEqual(kept);
});

test('suggestions and overview are mutually exclusive without changing camera; writing preserves its draft', async ({ page }) => {
    await boot(page, 1, 'dark', 1, true); await generate(page, 1, false); await toAtlas(page);
    await page.getByTestId('field').focus(); await page.keyboard.press('Escape');
    const camera = await page.locator('.world').getAttribute('style');
    const root = page.getByTestId('root-review-toggle'), suggestion = page.getByTestId('suggestion-review-toggle');
    await suggestion.click(); await expect(page.getByTestId('suggestion-review-panel')).toBeVisible();
    await root.click(); await expect(page.getByTestId('suggestion-review-panel')).toHaveCount(0); await expect(page.getByTestId('root-review-panel')).toBeVisible();
    await suggestion.click(); await expect(page.getByTestId('root-review-panel')).toHaveCount(0); await expect(page.getByTestId('suggestion-review-close')).toBeFocused();
    await expect(page.locator('.world')).toHaveAttribute('style', camera!);
    await page.getByTestId('speak').click();
    const composer = page.getByTestId('speak').locator('textarea'); await composer.fill('这份草稿不应被建议阅读打断。');
    await expect(page.getByTestId('suggestion-review-panel')).toHaveCount(0); await expect(composer).toHaveValue('这份草稿不应被建议阅读打断。');
});

test('a narrow window keeps the panel scrollable and its actions clear of writing', async ({ page }) => {
    await boot(page, 3, 'light', 1); await generate(page, 3);
    await page.getByTestId('field').focus(); await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 320, height: 640 });
    const toggle = page.getByTestId('suggestion-review-toggle'); await toggle.click();
    const panel = page.getByTestId('suggestion-review-panel'); const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(320); expect(box.height).toBeLessThanOrEqual(320);
    const speak = (await page.getByTestId('speak').boundingBox())!;
    expect(box.y + box.height <= speak.y || box.x + box.width <= speak.x || box.x >= speak.x + speak.width).toBe(true);
    await panel.locator('.suggestion-review-list').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect(panel.getByTestId('suggestion-ignore').last()).toBeVisible();
    await panel.getByTestId('suggestion-ignore').last().click(); await expect(panel.locator('section')).toHaveCount(2);
});

test('reading existing results keeps Stop usable and new arrivals never open or refocus the panel', async ({ page }) => {
    await boot(page, 3, 'dark', 1); await generate(page, 3);
    let respond: (() => Promise<void>) | undefined;
    const additional = '第二次请求的独立建议：保留每次观察的日期，并将后来补充的资料与最初的问题分别记录。'.repeat(5);
    await page.route('**/api/respond', route => new Promise<void>(resolve => {
        respond = async () => { await route.fulfill({ json: { providerLabel: 'Deferred fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text: additional }] } }); resolve(); };
    }));
    await page.locator('[data-thought-id="source"]').click(); await page.getByTestId('scope-continue').click();
    await page.getByRole('dialog').getByRole('button', { name: '1', exact: true }).click(); await page.getByTestId('action-preview-run').click();
    await expect.poll(() => !!respond).toBe(true);
    const stop = page.getByTestId('operation-feedback').getByRole('button', { name: '停止', exact: true }); await expect(stop).toBeVisible();
    const operationId = await page.getByTestId('operation-feedback').getAttribute('data-operation-id');
    await page.keyboard.press('Control+f');
    await page.locator('.find-bar input').fill('课程学习要怎样安排');
    await page.locator('.find-bar input').press('Enter');
    // Reveal schedules a camera frame; sample only once the persisted target and DOM agree.
    await expect.poll(async () => {
        const camera = (await saved(page)).camera;
        const matrix = await page.locator('.world').evaluate(el => {
            const value = new DOMMatrix(getComputedStyle(el).transform);
            return { x: value.m41, y: value.m42, zoom: value.a };
        });
        return Math.abs(camera.x - matrix.x) < .01 && Math.abs(camera.y - matrix.y) < .01
            && Math.abs(camera.zoom - matrix.zoom) < .00001 && (camera.x !== 0 || camera.y !== 0);
    }).toBe(true);
    const excursion = await page.locator('.world').getAttribute('style');
    await page.keyboard.press('Escape');
    await expect(page.locator('.world')).toHaveAttribute('style', excursion!);
    await expect(page.getByTestId('operation-feedback')).toHaveAttribute('data-operation-id', operationId!);
    await expect(page.getByTestId('operation-feedback')).toHaveAttribute('data-phase', 'pending');
    await page.getByTestId('navigation-return').focus(); await page.keyboard.press('Enter');
    await expect(stop).toBeVisible();
    await expect(page.getByTestId('operation-feedback')).toHaveAttribute('data-phase', 'pending');

    const toggle = page.getByTestId('suggestion-review-toggle'); await toggle.click();
    const panel = page.getByTestId('suggestion-review-panel'); await expect(panel).toBeVisible();
    const panelBox = (await panel.boundingBox())!, stopBox = (await stop.boundingBox())!;
    expect(panelBox.y + panelBox.height <= stopBox.y || panelBox.y >= stopBox.y + stopBox.height || panelBox.x + panelBox.width <= stopBox.x || panelBox.x >= stopBox.x + stopBox.width).toBe(true);
    await page.getByTestId('suggestion-review-close').click(); await expect(toggle).toBeFocused();
    const camera = await page.locator('.world').getAttribute('style');
    await respond!(); await expect(page.getByTestId('operation-feedback')).toHaveCount(0);
    await expect(toggle).toHaveText('建议 4'); await expect(toggle).toBeFocused(); await expect(panel).toHaveCount(0);
    await expect(page.locator('.world')).toHaveAttribute('style', camera!);
    await toggle.click(); await expect(panel.locator('section')).toHaveCount(4);
    await expect(panel.locator(`section[data-origin-scope="source"]`)).toHaveCount(4); await expect(panel).toContainText(additional);
});

test('a suggestion arriving during an open review retains its Keep receipt until that review closes', async ({ page }) => {
    await boot(page, 1, 'dark', 1); await generate(page, 1);
    const additional = '后来到达的建议：核对新观察与来源问题之间的关系，再决定是否留下。'.repeat(5);
    let respond: (() => Promise<void>) | undefined;
    await page.route('**/api/respond', route => new Promise<void>(resolve => {
        respond = async () => { await route.fulfill({ json: { providerLabel: 'Deferred fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text: additional }] } }); resolve(); };
    }));
    await page.locator('[data-thought-id="source"]').click();
    await page.getByTestId('scope-continue').click(); await page.getByTestId('action-preview-run').click();
    await expect.poll(() => !!respond).toBe(true);
    const toggle = page.getByTestId('suggestion-review-toggle'); await toggle.click();
    const panel = page.getByTestId('suggestion-review-panel'), close = page.getByTestId('suggestion-review-close');
    await expect(panel.locator('section')).toHaveCount(1); await expect(close).toBeFocused();
    const camera = await page.locator('.world').getAttribute('style');
    await respond!(); await expect(panel.locator('section')).toHaveCount(2);
    await expect(close).toBeFocused();
    const late = panel.locator('section').filter({ hasText: additional });
    const id = (await late.getAttribute('data-suggestion-id'))!;
    await late.getByTestId('suggestion-keep').click();
    await expect(late).toHaveAttribute('data-kept', 'true');
    await expect(late).toContainText('已留下'); await expect(late.locator('p')).toHaveText(additional);
    await expect(late.getByTestId('suggestion-keep')).toHaveCount(0);
    await expect(close).toBeFocused();
    await expect.poll(async () => (await saved(page)).thoughts[id]?.text).toBe(additional);
    await expect(page.locator('.world')).toHaveAttribute('style', camera!);
    await close.click(); await expect(toggle).toBeFocused();
    await toggle.click(); await expect(panel.locator('section')).toHaveCount(1);
    await expect(panel.locator(`[data-suggestion-id="${id}"]`)).toHaveCount(0);
});

test('larger interface type retains scrollable content and an ordinary Tab route out', async ({ page }) => {
    await boot(page, 5, 'light', 1); await generate(page, 5);
    await page.locator('.app').evaluate(el => (el as HTMLElement).style.setProperty('--type-ui-size', '22px'));
    await page.getByTestId('suggestion-review-toggle').click();
    const panel = page.getByTestId('suggestion-review-panel'); const box = (await panel.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(320); expect(box.width).toBeLessThanOrEqual(420);
    await expect(page.getByTestId('suggestion-review-close')).toBeVisible();
    await page.getByTestId('suggestion-review-close').press('Tab'); await expect(panel.getByTestId('suggestion-keep').first()).toBeFocused();
    await panel.getByTestId('suggestion-ignore').last().focus(); await page.keyboard.press('Tab');
    expect(await panel.evaluate(el => el.contains(document.activeElement))).toBe(false);
    expect(await page.getByTestId('field').evaluate(el => el.contains(document.activeElement))).toBe(true);
});
