import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';
import { validateProject } from '../../src/core/validation.ts';

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
    await expect(node(page, 'c').getByTestId('hierarchy-context')).toContainText('归属：A 层级想法');
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
            // Presentation becomes smaller without folding the branch or changing coordinates.
            await page.mouse.move(80, 100);
            await pinchTo(page, .65);
            await expect(node(page, 'd')).toBeVisible();
            await node(page, 'c').click();
            await node(page, 'c').getByTestId('branch-expand').click();
            await expect(node(page, 'd')).toHaveCount(0);
            await expect(node(page, 'c')).toBeVisible();
            await expect(node(page, 'c').getByTestId('branch-expand')).toBeVisible();
            expect((await node(page, 'c').locator('.hierarchy-level').boundingBox())!.height).toBeGreaterThanOrEqual(14);
            expect((await node(page, 'c').getByTestId('branch-expand').boundingBox())!.height).toBeGreaterThanOrEqual(18);
            await page.screenshot({ path: info.outputPath(`${profile}-${style}-collapsed.png`) });
        });
    }
}

test('zoom detail and Find preserve explicit folds, current context and coordinates', async ({ page }, info) => {
    await boot(page);
    await node(page, 'c').click(); await node(page, 'c').getByTestId('branch-expand').click();
    await expect(node(page, 'd')).toHaveCount(0);
    const before = await readThoughts(page);
    for (const zoom of [.65, .38]) {
        await pinchTo(page, zoom); await expect(node(page, 'c')).toBeVisible();
        await expect(node(page, 'd')).toHaveCount(0);
    }
    await pinchTo(page, .16); await expect(node(page, 'a')).toBeVisible();
    await expect(page.getByTestId('root-anchors')).toHaveAttribute('data-count', '2');
    const camera = await page.locator('.world').getAttribute('style');
    await page.keyboard.press('Control+f'); await page.locator('.find-bar input').fill('D 层级想法');
    await expect(node(page, 'd').locator('.thought-preview')).toHaveText('D 层级想法');
    await expect(node(page, 'd').getByTestId('hierarchy-context')).toContainText('归属：C 层级想法');
    await page.screenshot({ path: info.outputPath('find-deep-current-context.png') });
    await page.keyboard.press('Escape'); await expect(node(page, 'd')).toHaveCount(0);
    await expect(page.locator('.world')).toHaveAttribute('style', camera!);
    await pinchTo(page, .65); await node(page, 'c').click(); await node(page, 'c').getByTestId('branch-expand').click();
    await expect(node(page, 'd')).toBeVisible(); expect(await readThoughts(page)).toBe(before);
});

test('branch presentation follows reparent depth without zoom-triggered folds', async ({ page }) => {
    await boot(page);
    await reparent(page, 'c', 'A 层级想法');
    await pinchTo(page, .65);
    await expect(node(page, 'd')).toBeVisible();
    await expect(edge(page, 'c', 'd')).toHaveAttribute('data-depth', '2');
    await page.keyboard.press('Control+z');
    await expect(node(page, 'd')).toBeVisible();
    await expect(node(page, 'c').getByTestId('hierarchy-context')).toContainText('第 3 层');
    await expect(edge(page, 'c', 'd')).toHaveAttribute('data-depth', '3');
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
    await expect(node(page, 'd').getByTestId('hierarchy-context')).toContainText('归属：C 层级想法');
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

test('ordinary wheel is small and reversible without changing branch disclosure', async ({ page }, info) => {
    await boot(page); await pinchTo(page, .38);
    const before = await readThoughts(page), original = await liveZoom(page);
    await notch(page, 'up');
    expect((await liveZoom(page)) / original).toBeCloseTo(Math.pow(1.08, 1.2), 5);
    for (const id of ['a', 'b', 'c', 'd']) await expect(node(page, id)).toBeVisible();
    await notch(page, 'down'); expect(await liveZoom(page)).toBeCloseTo(original, 6);
    for (const id of ['a', 'b', 'c', 'd']) await expect(node(page, id)).toBeVisible();
    await expect.poll(() => savedZoom(page)).toBeCloseTo(original, 6);
    await page.reload(); await expect(node(page, 'd')).toBeVisible();
    expect(await liveZoom(page)).toBeCloseTo(original, 6); expect(await readThoughts(page)).toBe(before);
    await page.screenshot({ path: info.outputPath('wheel-preserves-deep-branch.png') });
});

test('wheel preserves manually folded reparented branches', async ({ page }) => {
    await boot(page); await reparent(page, 'c', 'A 层级想法');
    await node(page, 'c').click(); await node(page, 'c').getByTestId('branch-expand').click();
    await pinchTo(page, .38); await expect(node(page, 'd')).toHaveCount(0);
    await notch(page, 'up'); await expect(node(page, 'd')).toHaveCount(0);
    await notch(page, 'down'); await expect(node(page, 'd')).toHaveCount(0);
    await node(page, 'c').click(); await node(page, 'c').getByTestId('branch-expand').click();
    await expect(node(page, 'd')).toBeVisible(); await notch(page, 'down'); await expect(node(page, 'd')).toBeVisible();
});


async function bootBranches(page: Page, profile = 'editorial-warm') {
    await boot(page, profile);
    const p = createProject('main', '紧凑分支滚轮验收');
    const entries: [string, string | null, number, number, string][] = [
        ['z-root', null, 600, 400, '希望这个学习资料工具可以按课程分类和整理'],
        ['b-left', 'z-root', 120, 400, '课程名称可以自己手动添加，不用从固定列表里面挑选。'],
        ['b-up', 'z-root', 650, 120, '按课程分完之后，同一门课的资料能够整块收起来，也能整块拿走。'],
        ['b-right', 'z-root', 1060, 400, '先不用手动一个个建立课程，拿已有的课程名自动认识一遍，认不出来的再自己放进去。'],
        ['b-down', 'z-root', 1050, 850, '认不出来的放在一个待办列表里，放的时候顺手给个准确名字，下次它就能认识了。'],
        ['c-up', 'b-up', 1250, 110, '一门课整块收起来之后，学期结束了大概能整块挪走或者归档，不用再拆开分一遍。'],
        ['c-left', 'b-up', 370, 570, '有些东西可能不止属于一门课，比如同一本参考书或同一个模板，需要保留来源。'],
        ['c-bottom', 'b-right', 320, 780, '名字差不多但不完全一样的先归到疑似里面，再由使用者确认是否相同。'],
        ['independent', null, 800, 990, '另一个独立顶层想法保持原始坐标，不因为缩放而消失。'],
    ];
    for (const [id, parent, x, y, text] of entries) p.thoughts[id] = { ...makeThought(text, { x, y }, 1, id), ...(parent ? { derivedFrom: [parent], generationAction: 'continue' as const } : {}) };
    p.camera = { x: 30, y: 30, zoom: .65 };
    validateProject(p);
    await page.evaluate(p => new Promise<void>(resolve => {
        const r = indexedDB.open('diffusion-explorer-v1');
        r.onsuccess = () => { const db = r.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), p);
    await page.reload();
    await expect(node(page, 'z-root')).toBeVisible();
    return p;
}

for (const profile of ['editorial-warm', 'graphite-night']) {
    test(`wheel keeps compact branch context and selection in ${profile}`, async ({ page }, info) => {
        await bootBranches(page, profile);
        for (const [index, id] of ['z-root', 'b-right', 'c-up'].entries()) await node(page, id).click({ modifiers: index ? ['Shift'] : [] });
        await expect.poll(async () => { const saved = JSON.parse(await readThoughts(page)); return ['z-root', 'b-right', 'c-up'].every(id => saved[id].touchedAt > 1); }).toBe(true);
        const before = await readThoughts(page);
        const widths = await Promise.all(['z-root', 'b-left', 'b-up', 'b-right'].map(id => node(page, id).evaluate(el => el.getBoundingClientRect().width)));
        await notch(page, 'down');
        for (const [i, id] of ['z-root', 'b-left', 'b-up', 'b-right'].entries()) {
            await expect(node(page, id)).toBeVisible();
            expect(await node(page, id).evaluate(el => el.getBoundingClientRect().width)).toBeLessThan(widths[i] - 1);
        }
        for (const id of ['z-root', 'b-right', 'c-up']) await expect(node(page, id)).toHaveAttribute('data-selected', 'true');
        await expect(node(page, 'c-up')).toBeVisible();
        await page.screenshot({ path: info.outputPath('compact-selected-after-wheel.png') });
        await notch(page, 'up'); expect(await readThoughts(page)).toBe(before);
    });
}

test('explicitly folded selected children leave no floating controls and Find restores the fold', async ({ page }) => {
    await bootBranches(page); await node(page, 'c-up').click();
    await node(page, 'b-up').click(); await node(page, 'b-up').getByTestId('branch-expand').click();
    await expect(node(page, 'c-up')).toHaveCount(0);
    await notch(page, 'down'); await expect(node(page, 'c-up')).toHaveCount(0);
    const camera = await page.locator('.world').getAttribute('style');
    await page.keyboard.press('Control+f'); await page.locator('.find-bar input').fill('一门课整块收起来之后');
    await expect(node(page, 'c-up').locator('.thought-preview')).toContainText('不用再拆开分一遍');
    await page.keyboard.press('Escape'); await expect(node(page, 'c-up')).toHaveCount(0);
    await expect(page.locator('.world')).toHaveAttribute('style', camera!);
    await notch(page, 'up'); await expect(node(page, 'c-up')).toHaveCount(0);
});


async function bootDeepReading(page: Page, profile: string) {
    await boot(page, profile);
    const p = createProject('main', '十二层阅读上限验收');
    for (let i = 0; i < 12; i++) {
        const id = `deep-${i}`;
        p.thoughts[id] = {
            ...makeThought(`第 ${i + 1} 层：继续展开时，阅读大小保持适度，不因层级增多而无限放大。`, { x: 60 + i % 4 * 340, y: 150 + Math.floor(i / 4) * 220 }, 1, id),
            ...(i ? { derivedFrom: [`deep-${i - 1}`], generationAction: 'continue' as const } : {}),
        };
    }
    p.camera = { x: 30, y: 30, zoom: .65 };
    validateProject(p);
    await page.evaluate(p => new Promise<void>(resolve => {
        const r = indexedDB.open('diffusion-explorer-v1');
        r.onsuccess = () => { const db = r.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), p);
    await page.reload();
    await expect(node(page, 'deep-2')).toBeVisible();
    return p;
}
const liveZoom = (page: Page) => page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
const savedZoom = (page: Page) => page.evaluate(() => new Promise<number>(resolve => {
    const r = indexedDB.open('diffusion-explorer-v1');
    r.onsuccess = () => { const db = r.result, read = db.transaction('projects').objectStore('projects').get('main'); read.onsuccess = () => { resolve(read.result.camera.zoom); db.close(); }; };
}));

for (const profile of ['editorial-warm', 'graphite-night']) {
    test(`twelve levels remain reachable at moderate zoom in ${profile}`, async ({ page }, info) => {
        const p = await bootDeepReading(page, profile), before = await readThoughts(page);
        await pinchTo(page, .65);
        await expect(page.locator('article[data-thought-id^="deep-"]')).toHaveCount(12);
        const normalFont = await node(page, 'deep-0').evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--thought-size')));
        const fonts = await page.locator('article[data-thought-id^="deep-"]').evaluateAll(nodes => nodes.map(el => parseFloat(getComputedStyle(el).fontSize) * .65));
        for (const font of fonts) expect(font).toBeLessThanOrEqual(normalFont + .01);
        await page.screenshot({ path: info.outputPath('twelve-levels-moderate-zoom.png') });
        await expect.poll(() => savedZoom(page)).toBeCloseTo(.65, 6);
        await page.reload(); await expect(page.locator('article[data-thought-id^="deep-"]')).toHaveCount(12);
        expect(await liveZoom(page)).toBeCloseTo(.65, 6);
        await pinchTo(page, 1.4); await notch(page, 'down');
        await expect(node(page, 'deep-11')).toBeVisible(); expect(await liveZoom(page)).toBeGreaterThan(1);
        await pinchTo(page, 1); await expect(node(page, 'deep-11').locator('.thought-preview')).toHaveText(p.thoughts['deep-11'].text);
        expect(await readThoughts(page)).toBe(before);
    });
}
