import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';

const node = (page: Page, id: string) => page.locator('[data-thought-id="' + id + '"]');
const cue = (page: Page) => page.locator('.probe-cue');
async function boot(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'demo' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.goto('/?locale=en'); await expect(page.getByTestId('field')).toBeVisible();
    const p = createProject('main', 'Relation probe regression');
    for (const [id, x, y, parent] of [
        ['parent', 180, 180, null], ['child', 470, 180, 'parent'],
        ['offscreen', 5000, 800, 'child'], ['external', 1000, 180, null], ['spare', 180, 580, null],
    ] as const) p.thoughts[id] = { ...makeThought(id + ' thought', { x, y }, 1, id), organizingParentId: parent };
    await page.evaluate(p => new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('diffusion-explorer-v1'); r.onerror = () => reject(r.error);
        r.onsuccess = () => { const db = r.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), p);
    await page.reload(); await expect(node(page, 'parent')).toBeVisible();
}
async function positions(page: Page) {
    return page.evaluate(() => new Promise<Record<string, { x: number; y: number }>>(resolve => {
        const r = indexedDB.open('diffusion-explorer-v1');
        r.onsuccess = () => { const db = r.result, read = db.transaction('projects').objectStore('projects').get('main'); read.onsuccess = () => { resolve(Object.fromEntries(Object.entries(read.result.thoughts).map(([id, t]) => [id, { x: (t as { x: number }).x, y: (t as { y: number }).y }]))); db.close(); }; };
    }));
}
async function holdNear(page: Page, source: string, target: string) {
    const a = (await node(page, source).boundingBox())!, b = (await node(page, target).boundingBox())!;
    const dx = b.x - a.x - a.width - 24, dy = b.y - a.y;
    await page.mouse.move(a.x + 30, a.y + 20); await page.mouse.down();
    await page.mouse.move(a.x + 30 + dx, a.y + 20 + dy, { steps: 8 });
    return { dx, dy };
}
for (const folded of [false, true]) test('a single parent probes an external thought while moving its ' + (folded ? 'folded' : 'visible') + ' and offscreen descendants', async ({ page }, info) => {
    await boot(page); await node(page, 'parent').click();
    if (folded) await node(page, 'parent').getByTestId('branch-expand').click();
    const before = await positions(page), delta = await holdNear(page, 'parent', 'external');
    await expect(cue(page)).toBeVisible();
    await expect(cue(page).locator('[data-probe-caption]')).toHaveText('Release to explore');
    await page.screenshot({ path: info.outputPath('parent-relation-probe.png') });
    await page.mouse.up();
    await expect(node(page, 'parent')).toHaveAttribute('data-selected', 'true');
    await expect(node(page, 'external')).toHaveAttribute('data-selected', 'true');
    if (!folded) await expect(node(page, 'child')).toHaveAttribute('data-selected', 'false');
    const moved = { ...before, ...Object.fromEntries(['parent', 'child', 'offscreen'].map(id => [id, { x: before[id].x + delta.dx, y: before[id].y + delta.dy }])) };
    await expect.poll(() => positions(page)).toEqual(moved);
    await page.keyboard.press('Control+z'); await expect.poll(() => positions(page)).toEqual(before);
});

test('a moving descendant cannot become the parent probe target', async ({ page }) => {
    await boot(page); await node(page, 'parent').click();
    const before = await positions(page), delta = await holdNear(page, 'parent', 'child');
    await expect.poll(() => node(page, 'parent').getAttribute('style')).not.toBe('transform: translate(180px, 180px);');
    await expect(cue(page)).toBeHidden();
    await page.mouse.up();
    await expect(node(page, 'parent')).toHaveAttribute('data-selected', 'true');
    await expect(node(page, 'child')).toHaveAttribute('data-selected', 'false');
    const moved = { ...before, ...Object.fromEntries(['parent', 'child', 'offscreen'].map(id => [id, { x: before[id].x + delta.dx, y: before[id].y + delta.dy }])) };
    await expect.poll(() => positions(page)).toEqual(moved);
});

test('an explicit multi-selection moves its subtrees without offering a relation probe', async ({ page }) => {
    await boot(page); await node(page, 'parent').click(); await node(page, 'child').click({ modifiers: ['Shift'] });
    const before = await positions(page), delta = await holdNear(page, 'parent', 'external');
    await expect.poll(() => node(page, 'parent').getAttribute('style')).not.toBe('transform: translate(180px, 180px);');
    await expect(cue(page)).toBeHidden(); await page.mouse.up();
    await expect(node(page, 'external')).toHaveAttribute('data-selected', 'false');
    const moved = { ...before, ...Object.fromEntries(['parent', 'child', 'offscreen'].map(id => [id, { x: before[id].x + delta.dx, y: before[id].y + delta.dy }])) };
    await expect.poll(() => positions(page)).toEqual(moved);
});

test('cancelling an eligible parent probe restores its subtree and hides the cue', async ({ page }) => {
    await boot(page); await node(page, 'parent').click(); const before = await positions(page);
    await holdNear(page, 'parent', 'external');
    await expect(cue(page).locator('[data-probe-caption]')).toHaveText('Release to explore');
    await page.getByTestId('field').dispatchEvent('pointercancel'); await page.mouse.up();
    await expect(cue(page)).toBeHidden(); await expect.poll(() => positions(page)).toEqual(before);
    await expect(node(page, 'external')).toHaveAttribute('data-selected', 'false');
});
