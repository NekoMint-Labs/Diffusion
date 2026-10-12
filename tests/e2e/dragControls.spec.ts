import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
async function boot(page: Page, zoom: number, edge = false) {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', '拖动控件回归');
    project.camera = { x: 0, y: 0, zoom };
    project.thoughts.source = makeThought('移动这个长中文思绪时，阅读和回复按钮应始终能让人知道它们属于哪个思绪。'.repeat(3), { x: (edge ? 920 : 350) / zoom, y: (edge ? 320 : 200) / zoom }, 1, 'source');
    project.thoughts.other = makeThought('这张卡片和相机不应被拖动预览改变。', { x: 100 / zoom, y: 500 / zoom }, 1, 'other');
    await page.evaluate(project => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    }), project);
    await page.reload();
    await page.locator('[data-thought-id="source"]').click();
    await expect(page.locator('[data-thought-id="source"] .thought-local-actions')).toBeVisible();
    return project;
}
async function persisted(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result, read = db.transaction('projects').objectStore('projects').get('main'); read.onsuccess = () => { db.close(); resolve(read.result); }; read.onerror = () => reject(read.error); };
    }));
}
async function frameBounds(page: Page) {
    // Read the completed pointer frame directly: polling could conceal stale drag-time controls.
    return page.evaluate(() => new Promise<{ card: { x: number; y: number; width: number; height: number }; row: { x: number; y: number; width: number; height: number } }>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
        const card = document.querySelector<HTMLElement>('[data-thought-id="source"]')!;
        const rect = (element: Element) => { const b = element.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
        resolve({ card: rect(card), row: rect(card.querySelector('.thought-local-actions')!) });
    }))));
}
for (const zoom of [1, .55, 1.4]) test('read/respond controls follow every drag frame, cancel and repeated release at zoom ' + zoom, async ({ page }, info) => {
    const project = await boot(page, zoom);
    const before = await frameBounds(page);
    const other = await page.locator('[data-thought-id="other"]').boundingBox();
    const camera = await page.locator('.world').evaluate(el => getComputedStyle(el).transform);
    await page.mouse.move(before.card.x + 30, before.card.y + 20);
    await page.mouse.down();
    for (const [dx, dy] of [[60, 35], [110, 60], [160, 90]]) {
        await page.mouse.move(before.card.x + 30 + dx, before.card.y + 20 + dy);
        const during = await frameBounds(page);
        expect(during.card.x - before.card.x).toBeCloseTo(dx, 0);
        expect(during.card.y - before.card.y).toBeCloseTo(dy, 0);
        expect(during.row.x - before.row.x).toBeCloseTo(during.card.x - before.card.x, 0);
        expect(during.row.y - before.row.y).toBeCloseTo(during.card.y - before.card.y, 0);
    }
    await page.screenshot({ path: info.outputPath('controls-during-drag.png') });
    expect((await persisted(page)).thoughts.source.x).toBe(project.thoughts.source.x);
    expect((await persisted(page)).thoughts.source.y).toBe(project.thoughts.source.y);
    await page.getByTestId('field').dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
    await expect.poll(() => frameBounds(page)).toEqual(before);
    const released = { x: project.thoughts.source.x + 120 / zoom, y: project.thoughts.source.y + 60 / zoom };
    for (const [dx, dy] of [[80, 40], [40, 20]]) {
        const start = await frameBounds(page);
        await page.mouse.move(start.card.x + 30, start.card.y + 20);
        await page.mouse.down();
        await page.mouse.move(start.card.x + 30 + dx, start.card.y + 20 + dy, { steps: 4 });
        const during = await frameBounds(page);
        expect(during.row.x - start.row.x).toBeCloseTo(dx, 0);
        expect(during.row.y - start.row.y).toBeCloseTo(dy, 0);
        await page.mouse.up();
        await expect.poll(async () => (await frameBounds(page)).card.x).toBeCloseTo(during.card.x, 0);
    }
    await expect.poll(async () => { const { x, y } = (await persisted(page)).thoughts.source; return Math.max(Math.abs(x - released.x), Math.abs(y - released.y)); }).toBeLessThan(1e-6);
    expect(await page.locator('[data-thought-id="other"]').boundingBox()).toEqual(other);
    expect(await page.locator('.world').evaluate(el => getComputedStyle(el).transform)).toBe(camera);
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await frameBounds(page)).card.x).toBeCloseTo(before.card.x + 80, 0);
    await page.keyboard.press('Control+Shift+z');
    await expect.poll(async () => (await frameBounds(page)).card.x).toBeCloseTo(before.card.x + 120, 0);
    await page.getByTestId('field').click({ position: { x: 80, y: 650 } });
    await page.locator('[data-thought-id="source"]').click();
    const respond = page.locator('[data-thought-id="source"]').getByTestId('thought-respond');
    await respond.focus(); await respond.press('Enter');
    await expect(page.locator('.speak-references')).toContainText('移动这个长中文思绪');
    await page.reload();
    await expect.poll(async () => { const { x, y } = (await persisted(page)).thoughts.source; return Math.max(Math.abs(x - released.x), Math.abs(y - released.y)); }).toBeLessThan(1e-6);
    expect((await persisted(page)).camera).toEqual(project.camera);
});
test('edge drag keeps controls visible and operable after cancel', async ({ page }) => {
    await boot(page, 1, true);
    const before = await frameBounds(page);
    await page.mouse.move(before.card.x + 30, before.card.y + 20); await page.mouse.down();
    await page.mouse.move(before.card.x + 85, before.card.y + 160, { steps: 6 });
    const during = await frameBounds(page);
    expect(during.row.x).toBeGreaterThanOrEqual(16);
    expect(during.row.y).toBeGreaterThanOrEqual(16);
    expect(during.row.x + during.row.width).toBeLessThanOrEqual(1264);
    expect(during.row.y + during.row.height).toBeLessThanOrEqual(704);
    expect(during.row.x !== before.row.x || during.row.y !== before.row.y).toBe(true);
    await page.getByTestId('field').dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up();
    await expect.poll(async () => (await frameBounds(page)).card).toEqual(before.card);
    await page.locator('[data-thought-id="source"] .thought-read').click();
    await expect(page.getByRole('dialog')).toContainText('移动这个长中文思绪');
});
