import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';

async function boot(page: Page, offscreen = false) {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.goto('/?locale=zh'); await expect(page.getByTestId('field')).toBeVisible();
    const p = createProject('main', '空间交互回归');
    for (const [i, id] of ['a', 'b', 'c', 'd', 'other'].entries()) {
        p.thoughts[id] = { ...makeThought(i === 0 ? '01234567890\n12341423652352\n版本 0.3.0' : `${id} 分支内容`, { x: i === 4 ? 850 : offscreen && i === 3 ? 5000 : 180 + i * 200, y: i === 4 ? 600 : 220 + i * 65 }, 1, id), organizingParentId: i > 0 && i < 4 ? ['a', 'b', 'c'][i - 1] : null };
    }
    await page.evaluate(p => new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('diffusion-explorer-v1'); r.onerror = () => reject(r.error);
        r.onsuccess = () => { const db = r.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), p);
    await page.reload(); await expect(node(page, 'a')).toBeVisible();
}
const node = (page: Page, id: string) => page.locator(`[data-thought-id="${id}"]`);
async function positions(page: Page) {
    return page.evaluate(() => new Promise<Record<string, { x: number; y: number }>>(resolve => {
        const r = indexedDB.open('diffusion-explorer-v1');
        r.onsuccess = () => { const db = r.result, get = db.transaction('projects').objectStore('projects').get('main'); get.onsuccess = () => { resolve(Object.fromEntries(Object.entries(get.result.thoughts).map(([id, t]) => [id, { x: (t as { x: number }).x, y: (t as { y: number }).y }]))); db.close(); }; };
    }));
}
async function drag(page: Page, id: string, dx: number, dy: number, cancel = false) {
    const box = (await node(page, id).boundingBox())!;
    await page.mouse.move(box.x + 35, box.y + 25); await page.mouse.down();
    await page.mouse.move(box.x + 35 + dx, box.y + 25 + dy, { steps: 8 });
    if (cancel) await page.getByTestId('field').dispatchEvent('pointercancel');
    await page.mouse.up();
}

test('parent drag preserves its folded and offscreen subtree, undo/redo and reopen', async ({ page }, info) => {
    await boot(page, true);
    const before = await positions(page);
    await node(page, 'a').click(); await node(page, 'a').getByTestId('branch-expand').click();
    await expect(node(page, 'b')).toHaveCount(0);
    await drag(page, 'a', 85, 55);
    const expected = { ...before, ...Object.fromEntries(['a', 'b', 'c', 'd'].map(id => [id, { x: before[id].x + 85, y: before[id].y + 55 }])) };
    await expect.poll(() => positions(page)).toEqual(expected);
    await page.keyboard.press('Control+z'); await expect.poll(() => positions(page)).toEqual(before);
    await expect(node(page, 'b')).toHaveCount(0);
    await page.keyboard.press('Control+Shift+z'); await expect.poll(() => positions(page)).toEqual(expected);
    await node(page, 'a').getByTestId('branch-expand').click(); await expect(node(page, 'b')).toBeVisible();
    await page.screenshot({ path: info.outputPath('moved-subtree.png') });
    await page.reload(); await expect.poll(() => positions(page)).toEqual(expected);
});

test('overlapping parent/child selection moves descendants once and cancellation restores preview', async ({ page }) => {
    await boot(page); const before = await positions(page);
    await node(page, 'a').click(); await node(page, 'b').click({ modifiers: ['Shift'] });
    await drag(page, 'a', 70, 30, true);
    await expect.poll(() => positions(page)).toEqual(before);
    await expect(node(page, 'a')).toHaveAttribute('style', `transform: translate(${before.a.x}px, ${before.a.y}px);`);
    await drag(page, 'a', 70, 30);
    const moved = { ...before, ...Object.fromEntries(['a', 'b', 'c', 'd'].map(id => [id, { x: before[id].x + 70, y: before[id].y + 30 }])) };
    await expect.poll(() => positions(page)).toEqual(moved);
    await page.keyboard.press('Control+z'); await expect.poll(() => positions(page)).toEqual(before);
});

test('a child drag moves only its own subtree and preserves its parent and sibling', async ({ page }) => {
    await boot(page); const before = await positions(page);
    await drag(page, 'b', -45, 70);
    const expected = { ...before, ...Object.fromEntries(['b', 'c', 'd'].map(id => [id, { x: before[id].x - 45, y: before[id].y + 70 }])) };
    await expect.poll(() => positions(page)).toEqual(expected);
});

test('replacement pointer and button menus use the new anchor, including viewport edges', async ({ page }, info) => {
    await boot(page); const field = page.getByTestId('field');
    await field.click({ button: 'right', position: { x: 80, y: 150 } });
    await expect(page.getByTestId('blank-menu')).toBeVisible();
    const first = (await page.getByTestId('blank-menu').boundingBox())!;
    await field.click({ button: 'right', position: { x: 1000, y: 750 } });
    const menu = page.getByTestId('blank-menu'); await expect(menu).toBeVisible();
    await expect.poll(async () => (await menu.boundingBox())!.x).toBeGreaterThan(first.x + 400);
    let box = (await menu.boundingBox())!; expect(box.y).toBeGreaterThan(first.y + 300);
    await page.getByTestId('field-title').click(); await expect(page.getByTestId('field-menu')).toBeVisible();
    box = (await page.getByTestId('field-menu').boundingBox())!; expect(box.y).toBeLessThan(200);
    await page.keyboard.press('Escape'); await expect(page.getByTestId('field-title')).toBeFocused();
    await field.click({ button: 'right', position: { x: 1410, y: 940 } });
    box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(15); expect(box.x + box.width).toBeLessThanOrEqual(1425);
    expect(box.y).toBeGreaterThanOrEqual(15); expect(box.y + box.height).toBeLessThanOrEqual(945);
    await expect.poll(() => menu.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await page.screenshot({ path: info.outputPath('replacement-menu-edge.png') });
});

test('numeric reading and editing preserve exact content and use stable lining tabular glyphs', async ({ page }, info) => {
    await boot(page); const thought = node(page, 'a'), text = '01234567890\n12341423652352\n版本 0.3.0';
    await page.evaluate(async () => { await document.fonts.ready; });
    await expect(thought.locator('.thought-preview')).toHaveText(text);
    const reading = await thought.locator('.thought-preview').evaluate(el => {
        const s = getComputedStyle(el), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!;
        ctx.font = `${s.fontSize} ${s.fontFamily}`;
        return { family: s.fontFamily, variant: s.fontVariantNumeric, widths: ['111111', '888888', '000000'].map(text => ctx.measureText(text).width) };
    });
    expect(Math.max(...reading.widths) - Math.min(...reading.widths)).toBeLessThan(.1);
    await thought.dblclick(); const editor = thought.locator('textarea'); await expect(editor).toHaveValue(text);
    const editing = await editor.evaluate(el => ({ family: getComputedStyle(el).fontFamily, variant: getComputedStyle(el).fontVariantNumeric }));
    expect(editing).toEqual({ family: reading.family, variant: reading.variant });
    await page.screenshot({ path: info.outputPath('digits-editing.png') });
    await editor.press('Enter'); await expect(thought.locator('.thought-preview')).toHaveText(text);
    await page.reload(); await expect(thought.locator('.thought-preview')).toHaveText(text);
    await page.screenshot({ path: info.outputPath('digits-saved.png') });
});

for (const theme of ['light', 'dark']) for (const reduced of [false, true]) {
    test(`proposal outline is visible without hover and Keep preserves identity/position in ${theme}, reduced=${reduced}`, async ({ page }, info) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
        await page.addInitScript(theme => {
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', theme, appearance: { profile: theme === 'dark' ? 'graphite-night' : 'editorial-warm' }, provider: 'demo' }));
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
        }, theme);
        await page.goto('/demo?locale=zh');
        const input = page.getByTestId('speak').locator('textarea');
        await input.fill('可能真正的问题是学习资料太多，而不是缺少新的工具。'); await input.press('Enter');
        await page.getByTestId('scope-continue').click(); await page.getByTestId('action-preview-run').click();
        const ghost = page.locator('.thought.ghost').first(); await expect(ghost).toBeVisible();
        await expect(page.getByTestId('operation-feedback')).toHaveCount(0);
        await expect(page.locator('html')).toHaveAttribute('data-style-profile', theme === 'dark' ? 'graphite-night' : 'editorial-warm');
        await page.mouse.move(1230, 650);
        expect(await ghost.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('dashed');
        expect(await ghost.getAttribute('data-selected')).toBe('false');
        await page.screenshot({ path: info.outputPath('unselected-proposal.png') });
        await page.mouse.move(640, 360);
        for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 120);
        await expect.poll(() => page.getByTestId('field').getAttribute('data-camera-moving')).toBeNull();
        await expect(ghost).toBeVisible();
        expect(await ghost.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('dashed');
        await page.mouse.move(1230, 650);
        await page.screenshot({ path: info.outputPath('compact-unselected-proposal.png') });
        const id = await ghost.getAttribute('data-thought-id'), thought = node(page, id!);
        await thought.click(); const before = await thought.getAttribute('style');
        await page.getByTestId('ai-proposal-keep').click();
        await expect(thought).not.toHaveClass(/ghost/); await expect(thought).toHaveAttribute('style', before!);
        expect(await thought.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('dashed');
        await page.screenshot({ path: info.outputPath('committed-proposal.png') });
    });
}

test('Atlas descendant anchors follow the parent drag preview and cancel without canonical movement', async ({ page }) => {
    await boot(page); const before = await positions(page);
    await page.mouse.move(80, 100); await page.keyboard.down('Control');
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 60);
    await page.keyboard.up('Control');
    await expect.poll(() => page.getByTestId('field').getAttribute('data-camera-moving')).toBeNull();
    const anchors = page.getByTestId('root-anchors').locator('path');
    await expect(anchors).toHaveAttribute('d', /M380,285/);
    const path = await anchors.getAttribute('d'), box = (await node(page, 'a').boundingBox())!;
    await page.mouse.move(box.x + 25, box.y + 25); await page.mouse.down();
    await page.mouse.move(box.x + 85, box.y + 65, { steps: 6 });
    await expect(anchors).not.toHaveAttribute('d', path!);
    await expect.poll(() => positions(page)).toEqual(before);
    await page.getByTestId('field').dispatchEvent('pointercancel'); await page.mouse.up();
    await expect(anchors).toHaveAttribute('d', path!);
    await expect.poll(() => positions(page)).toEqual(before);
});
