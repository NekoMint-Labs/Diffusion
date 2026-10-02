import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';

async function boot(page: Page, profile = 'editorial-warm', style = 'curve', zoom = 1) {
    await page.addInitScript(({ profile, style }) => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo', appearance: { profile, connectionStyle: style } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, { profile, style });
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
    const p = createProject('main', '当前层级验收');
    const positions = [[100, 100], [700, 240], [100, 510], [700, 700], [1120, 100]];
    for (const [i, id] of ['a', 'b', 'c', 'd', 'x'].entries()) {
        p.thoughts[id] = makeThought(`${id.toUpperCase()} 层级想法`, { x: positions[i][0], y: positions[i][1] }, 1, id);
        if (i > 0 && i < 4) Object.assign(p.thoughts[id], { derivedFrom: [String.fromCharCode(96 + i)], generationAction: i === 2 ? 'question' : 'continue' });
    }
    p.camera = { x: 30, y: 50, zoom };
    await page.evaluate(p => new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('diffusion-explorer-v1');
        r.onerror = () => reject(r.error);
        r.onsuccess = () => { const db = r.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), p);
    await page.reload();
    await expect(page.locator('[data-thought-id="a"]')).toBeVisible();
    return p;
}
async function pinchTo(page: Page, target: number) {
    await page.keyboard.down('Control');
    await page.mouse.move(80, 100);
    const zoom = () => page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
    for (let i = 0; i < 10; i++) {
        const current = await zoom();
        if (Math.abs(current - target) < .001) break;
        const delta = Math.max(-60, Math.min(60, Math.log(current / target) / .006));
        await page.mouse.wheel(0, delta);
        await expect.poll(zoom).not.toBe(current);
    }
    await page.keyboard.up('Control');
    await expect.poll(zoom).toBeCloseTo(target, 2);
    await page.waitForTimeout(180); // Finish the camera's normal stable-commit debounce.
}
const edge = (page: Page, parent: string, child: string) => page.locator(`[data-causal-id="causal:${parent}:${child}"]`);
const node = (page: Page, id: string) => page.locator(`[data-thought-id="${id}"]`);
async function lineStyle(page: Page, parent: string, child: string) {
    return edge(page, parent, child).locator('.causal-trace-visual').evaluate(el => {
        const s = getComputedStyle(el);
        return { stroke: s.stroke, dash: s.strokeDasharray, width: s.strokeWidth, marker: s.markerEnd };
    });
}
async function reparent(page: Page, id: string, option: string) {
    await node(page, id).click();
    await page.getByTestId('thought-more').click();
    await page.locator('[data-command="thought-lineage"]').click();
    await page.getByTestId('organizing-parent').click();
    await page.getByRole('option', { name: option, exact: true }).click();
    await page.getByTestId('apply-parent').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function readThoughts(page: Page) {
    return page.evaluate(() => new Promise<string>(resolve => {
        const r = indexedDB.open('diffusion-explorer-v1');
        r.onsuccess = () => { const db = r.result, read = db.transaction('projects').objectStore('projects').get('main'); read.onsuccess = () => { resolve(JSON.stringify(read.result.thoughts)); db.close(); }; };
    }));
}

test('current-parent styles update across the whole branch, history and reopening', async ({ page }, info) => {
    const original = await boot(page);
    await expect(edge(page, 'c', 'd')).toHaveAttribute('data-depth', '3');
    const s1 = await lineStyle(page, 'a', 'b'), s2 = await lineStyle(page, 'b', 'c'), s3 = await lineStyle(page, 'c', 'd');
    expect(new Set([s1.stroke, s2.stroke, s3.stroke]).size).toBe(3);
    expect(new Set([s1.dash, s2.dash, s3.dash]).size).toBe(3);
    await page.screenshot({ path: info.outputPath('initial-current-chain.png') });
    await reparent(page, 'x', 'A 层级想法');
    expect(await lineStyle(page, 'a', 'x')).toEqual(s1);
    await reparent(page, 'c', 'A 层级想法');
    await expect(edge(page, 'b', 'c')).toHaveCount(0);
    expect(await lineStyle(page, 'a', 'c')).toEqual(s1);
    expect(await lineStyle(page, 'c', 'd')).toEqual(s2);
    await expect(node(page, 'c').getByTestId('hierarchy-context')).toContainText('第 2 层');
    await expect(node(page, 'c').getByTestId('hierarchy-context')).toContainText('上级：A 层级想法');
    await expect(node(page, 'c')).toHaveAttribute('data-origin-scope', 'b');
    await page.screenshot({ path: info.outputPath('reparented-current-chain.png') });
    await page.keyboard.press('Control+z');
    await expect(edge(page, 'a', 'c')).toHaveCount(0);
    expect(await lineStyle(page, 'b', 'c')).toEqual(s2);
    expect(await lineStyle(page, 'c', 'd')).toEqual(s3);
    await page.keyboard.press('Control+Shift+z');
    await expect(edge(page, 'b', 'c')).toHaveCount(0);
    expect(await lineStyle(page, 'c', 'd')).toEqual(s2);
    await expect.poll(async () => JSON.parse(await readThoughts(page)).c.organizingParentId).toBe('a');
    await page.reload();
    await expect(edge(page, 'b', 'c')).toHaveCount(0);
    expect(await lineStyle(page, 'a', 'c')).toEqual(s1);
    expect(await lineStyle(page, 'c', 'd')).toEqual(s2);
    const saved = JSON.parse(await readThoughts(page));
    for (const id of Object.keys(original.thoughts)) expect(saved[id]).toMatchObject({ text: original.thoughts[id].text, x: original.thoughts[id].x, y: original.thoughts[id].y });
    await reparent(page, 'c', '独立想法');
    await expect(edge(page, 'a', 'c')).toHaveCount(0);
    expect(await lineStyle(page, 'c', 'd')).toEqual(s1);
    await expect(node(page, 'c').getByTestId('hierarchy-context')).toContainText('顶层');
});

for (const profile of ['editorial-warm', 'studio-slate', 'quiet-forest', 'graphite-night']) {
    for (const style of ['curve', 'elbow']) {
        test(`unselected levels stay distinguishable in ${profile} with ${style}`, async ({ page }, info) => {
            await boot(page, profile, style);
            await page.mouse.move(1380, 900);
            await expect(edge(page, 'a', 'b')).toHaveAttribute('data-causal-state', 'sleep');
            const samples = await Promise.all([lineStyle(page, 'a', 'b'), lineStyle(page, 'b', 'c'), lineStyle(page, 'c', 'd')]);
            expect(new Set(samples.map(s => s.stroke)).size).toBe(3);
            expect(new Set(samples.map(s => s.dash)).size).toBe(3);
            for (const pair of [['a', 'b'], ['b', 'c'], ['c', 'd']]) {
                await expect(edge(page, pair[0], pair[1])).toHaveAttribute('data-line-style', style);
                expect((await lineStyle(page, pair[0], pair[1])).marker).toContain('hierarchy-direction-');
            }
            await page.screenshot({ path: info.outputPath(`${profile}-${style}-all.png`) });
            // Continuous pinch input crosses the deepest-level boundary while preserving canonical geometry.
            await page.mouse.move(80, 100);
            await pinchTo(page, .65);
            await expect(node(page, 'd')).toHaveCount(0);
            await expect(node(page, 'c')).toBeVisible();
            await expect(node(page, 'c').getByTestId('branch-expand')).toBeVisible();
            expect((await node(page, 'c').locator('.hierarchy-level').boundingBox())!.height).toBeGreaterThanOrEqual(14);
            expect((await node(page, 'c').getByTestId('branch-expand').boundingBox())!.height).toBeGreaterThanOrEqual(18);
            await page.screenshot({ path: info.outputPath(`${profile}-${style}-collapsed.png`) });
        });
    }
}

test('zoom stages, explicit expansion and Find preserve readable current context and coordinates', async ({ page }, info) => {
    await boot(page);
    const before = await readThoughts(page);
    await page.mouse.move(80, 100);
    await pinchTo(page, .65);
    await expect(node(page, 'd')).toHaveCount(0);
    await expect(node(page, 'c')).toBeVisible();
    await pinchTo(page, .38);
    await expect(node(page, 'c')).toHaveCount(0);
    await expect(node(page, 'b')).toBeVisible();
    await expect(node(page, 'b').getByTestId('branch-expand')).toContainText('1 个下级');
    await pinchTo(page, .16);
    await expect(node(page, 'b')).toHaveCount(0);
    await expect(node(page, 'a')).toBeVisible();
    await expect(page.getByTestId('hierarchy-disclosure')).toContainText('顶层');
    const camera = await page.locator('.world').getAttribute('style');
    await page.screenshot({ path: info.outputPath('roots-with-branch-cues.png') });
    await page.keyboard.press('Control+f');
    await page.locator('.find-bar input').fill('D 层级想法');
    await expect(node(page, 'd')).toBeVisible();
    await expect(node(page, 'd').getByTestId('hierarchy-context')).toContainText('第 4 层');
    await expect(node(page, 'd').getByTestId('hierarchy-context')).toContainText('上级：C 层级想法');
    await expect(node(page, 'd').locator('.thought-preview')).toHaveText('D 层级想法');
    await page.screenshot({ path: info.outputPath('find-deep-current-context.png') });
    await page.keyboard.press('Escape');
    await expect(node(page, 'd')).toHaveCount(0);
    await expect(page.locator('.world')).toHaveAttribute('style', camera!);
    await node(page, 'a').getByTestId('branch-expand').click();
    await expect(node(page, 'b')).toBeVisible();
    await expect(node(page, 'b').getByTestId('hierarchy-context')).toContainText('第 2 层');
    expect(await readThoughts(page)).toBe(before);
});

test('branch collapse follows the new depth on reparent, undo and redo', async ({ page }) => {
    await boot(page);
    await reparent(page, 'c', 'A 层级想法');
    await pinchTo(page, .65);
    await expect(node(page, 'd')).toBeVisible();
    await expect(edge(page, 'c', 'd')).toHaveAttribute('data-depth', '2');
    await page.keyboard.press('Control+z');
    await expect(node(page, 'd')).toHaveCount(0);
    await expect(node(page, 'c').getByTestId('hierarchy-context')).toContainText('第 3 层');
    await expect(node(page, 'c').getByTestId('branch-expand')).toBeVisible();
    await page.keyboard.press('Control+Shift+z');
    await expect(node(page, 'd')).toBeVisible();
    await expect(edge(page, 'c', 'd')).toHaveAttribute('data-depth', '2');
    await expect(node(page, 'c').getByTestId('hierarchy-context')).toContainText('第 2 层');
});

test('Find at low zoom reveals full long wording with current parent context', async ({ page }) => {
    const p = await boot(page);
    const wording = 'D 深层完整文字：' + '这是隐藏分支中需要完整阅读的长内容，查找时应保留全部文字。'.repeat(5);
    p.thoughts.d.text = wording;
    p.camera = { x: 30, y: 50, zoom: .2 };
    await page.evaluate(p => new Promise<void>(resolve => {
        const r = indexedDB.open('diffusion-explorer-v1');
        r.onsuccess = () => { const db = r.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), p);
    await page.reload();
    await expect(node(page, 'd')).toHaveCount(0);
    await page.keyboard.press('Control+f');
    await page.locator('.find-bar input').fill('D 深层完整文字');
    await expect(node(page, 'd').locator('.thought-preview')).toHaveText(wording);
    await expect(node(page, 'd').getByTestId('hierarchy-context')).toContainText('上级：C 层级想法');
    await page.keyboard.press('Escape');
    await expect(node(page, 'd')).toHaveCount(0);
    expect(JSON.parse(await readThoughts(page)).d.text).toBe(wording);
});


async function notch(page: Page, direction: 'up' | 'down') {
    await page.mouse.move(80, 100);
    const before = await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
    await page.mouse.wheel(0, direction === 'up' ? -120 : 120);
    await expect.poll(() => page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).not.toBe(before);
    await expect.poll(() => page.getByTestId('field').getAttribute('data-camera-moving')).toBeNull();
    const after = await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
    expect(direction === 'up' ? after > before : after < before).toBe(true);
}

test('one upward notch adds the next level and one downward notch removes the deepest level', async ({ page }, info) => {
    await boot(page, 'editorial-warm', 'curve', .38);
    const before = await readThoughts(page);
    await expect(node(page, 'b')).toBeVisible();
    await expect(node(page, 'c')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('wheel-before-A-B.png') });
    await notch(page, 'up');
    await expect(node(page, 'c')).toBeVisible();
    await expect(node(page, 'd')).toHaveCount(0);
    await expect(page.getByTestId('hierarchy-disclosure')).toContainText('第 3 层');
    await page.screenshot({ path: info.outputPath('wheel-up-A-B-C.png') });
    await notch(page, 'down');
    await expect(node(page, 'b')).toBeVisible();
    await expect(node(page, 'c')).toHaveCount(0);
    await notch(page, 'down');
    await expect(node(page, 'b')).toHaveCount(0);
    await expect(node(page, 'a')).toBeVisible();
    await expect(node(page, 'a').getByTestId('branch-expand')).toContainText('1 个下级');
    await page.screenshot({ path: info.outputPath('wheel-down-A.png') });
    await page.reload();
    await expect(node(page, 'b')).toHaveCount(0);
    await notch(page, 'up');
    await expect(node(page, 'b')).toBeVisible();
    await expect(node(page, 'c')).toHaveCount(0);
    await notch(page, 'up');
    await expect(node(page, 'c')).toBeVisible();
    await expect(node(page, 'd')).toHaveCount(0);
    await page.reload();
    await expect(node(page, 'c')).toBeVisible();
    await expect(node(page, 'd')).toHaveCount(0);
    expect(await readThoughts(page)).toBe(before);
});

test('wheel steps use current reparented levels and close a manually opened child', async ({ page }) => {
    await boot(page);
    await reparent(page, 'c', 'A 层级想法');
    await page.mouse.click(80, 100); // Release protected selection before normal disclosure.
    await pinchTo(page, .38);
    await expect(node(page, 'b')).toBeVisible();
    await expect(node(page, 'c')).toBeVisible();
    await expect(node(page, 'd')).toHaveCount(0);
    await notch(page, 'up');
    await expect(node(page, 'd')).toBeVisible();
    await notch(page, 'down');
    await expect(node(page, 'd')).toHaveCount(0);
    await notch(page, 'down');
    await expect(node(page, 'b')).toHaveCount(0);
    await expect(node(page, 'c')).toHaveCount(0);
    await node(page, 'a').getByTestId('branch-expand').click();
    await expect(node(page, 'b')).toBeVisible();
    await expect(node(page, 'c')).toBeVisible();
    await notch(page, 'down');
    await expect(node(page, 'b')).toHaveCount(0);
    await expect(node(page, 'c')).toHaveCount(0);
});
