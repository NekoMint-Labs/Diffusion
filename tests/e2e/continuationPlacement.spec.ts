import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';
import { validateProject } from '../../src/core/validation.ts';

async function projectRecord(page: Page, write?: ProjectState): Promise<ProjectState> {
    return page.evaluate(project => new Promise<ProjectState>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const transaction = db.transaction('projects', project ? 'readwrite' : 'readonly');
            const store = transaction.objectStore('projects');
            const request = project ? store.put(project) : store.get('main');
            transaction.oncomplete = () => { db.close(); resolve(project ?? request.result); };
            transaction.onerror = () => { db.close(); reject(transaction.error); };
        };
    }), write);
}

test.use({ viewport: { width: 898, height: 804 } });
for (const [count, theme, zoom] of [[1, 'light', 1], [3, 'light', 1], [1, 'dark', .8], [3, 'dark', .8]] as const) {
    test(count + ' continuations stay visible near a long Chinese source in ' + theme + ' at zoom ' + zoom, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(theme => {
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'skipped' }));
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'gateway', theme, appearance: { profile: theme === 'dark' ? 'graphite-night' : 'editorial-warm' } }));
        }, theme);
        let requests = 0;
        let release!: () => void;
        const responseReady = new Promise<void>(resolve => { release = resolve; });
        await page.route('**/api/respond', async route => {
            requests++;
            await responseReady;
            await route.fulfill({ json: { providerLabel: 'Placement fixture / not live', mock: true, intents: Array.from({ length: count }, (_, i) => ({ type: 'surface_possibility', text: '位置验证示例' + (i + 1) + '：闭环采集需要能在下一次拍摄前算出的不确定性，而不是等拍摄结束才出现的重建分数。'.repeat(3) })) } });
        });
        await page.goto('/?locale=zh');
        await expect.poll(async () => (await projectRecord(page))?.id).toBe('main');
        const now = Date.now();
        const project = createProject('main', '继续想位置回归', now);
        project.camera = { x: 0, y: 0, zoom };
        project.thoughts.parent = makeThought('稀疏视角重建和智能体的结合', { x: 190, y: 310 }, now, 'parent');
        project.thoughts.source = { ...makeThought('如果智能体不只是拿来后处理重建结果，而是让它决定下一张图从哪里拍，稀疏视角的问题就从给多少张变成接下来该看哪里，闭环采集和离线重建是两件不同的事。'.repeat(2), { x: 153, y: 415 }, now, 'source'), derivedFrom: ['parent'], generationAction: 'continue' };
        await projectRecord(page, validateProject(project));
        await page.reload();
        const source = page.locator('[data-thought-id="source"]');
        await source.click();
        const before = await source.boundingBox();
        const previewBefore = await source.locator('.thought-preview').boundingBox();
        const transform = await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform);
        await page.getByTestId('scope-continue').click();
        const preview = page.getByRole('dialog', { name: '继续想', exact: true });
        await preview.getByRole('button', { name: String(count), exact: true }).click();
        await page.getByTestId('action-preview-run').click();
        await expect.poll(() => requests).toBe(1);
        await expect(page.getByTestId('operation-feedback')).toContainText('继续');
        await expect(page.locator('.thought.ghost')).toHaveCount(0);
        release();
        const ghosts = page.locator('.thought.ghost');
        await expect(ghosts).toHaveCount(count);
        await expect.poll(async () => {
            const boxes = await ghosts.evaluateAll(elements => elements.map(element => { const b = element.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }));
            return boxes.every(b => b.x >= 0 && b.y >= 0 && b.x + b.width <= 898 && b.y + b.height <= 804);
        }).toBe(true);
        const boxes = await ghosts.evaluateAll(elements => elements.map(element => { const b = element.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }));
        const overlaps = (a: typeof boxes[number], b: typeof boxes[number]) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
        const identity = await page.locator('.identity').boundingBox();
        expect(identity).not.toBeNull();
        for (const [i, box] of boxes.entries()) {
            expect(overlaps(box, identity!)).toBe(false);
            expect(overlaps(box, before!)).toBe(false);
            expect(boxes.slice(0, i).some(other => overlaps(box, other))).toBe(false);
        }
        // Culling may reorder mounted DOM nodes; identify the first emitted result by wording.
        const first = (await ghosts.filter({ hasText: '位置验证示例1：' }).boundingBox())!;
        expect(first).not.toBeNull();
        const dx = Math.max(0, before!.x - first.x - first.width, first.x - before!.x - before!.width);
        const dy = Math.max(0, before!.y - first.y - first.height, first.y - before!.y - before!.height);
        expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(140);
        // A transient child adds #11's explicit branch disclosure below the unchanged text.
        // Preserve the exact content bounds and card anchor; qualify the added height separately.
        const after = (await source.boundingBox())!;
        expect({ x: after.x, y: after.y, width: after.width }).toEqual({ x: before!.x, y: before!.y, width: before!.width });
        expect(await source.locator('.thought-preview').boundingBox()).toEqual(previewBefore);
        const disclosureHeight = await source.getByTestId('branch-expand').evaluate(element => {
            const scale = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.world')!).transform).a;
            return element.getBoundingClientRect().height + parseFloat(getComputedStyle(element).marginTop) * scale;
        });
        expect(after.height - before!.height).toBeCloseTo(disclosureHeight, 1);
        expect(await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform)).toBe(transform);
        expect((await projectRecord(page)).thoughts).toEqual(project.thoughts);
        // Reading controls are a separate UI footprint and must also remain reachable.
        for (const proposal of await ghosts.all()) {
            await proposal.click();
            const read = proposal.getByRole('button', { name: '阅读全文', exact: true });
            const control = await read.boundingBox();
            expect(control).not.toBeNull();
            expect(control!.y + control!.height).toBeLessThanOrEqual(804);
            const caption = await proposal.locator('.ghost-label').boundingBox();
            expect(caption).not.toBeNull();
            expect(caption!.y + caption!.height).toBeLessThanOrEqual(control!.y);
        }
        const firstProposal = ghosts.filter({ hasText: '位置验证示例1：' });
        await firstProposal.click();
        const fullWords = await firstProposal.locator('p').textContent();
        await firstProposal.getByRole('button', { name: '阅读全文', exact: true }).click();
        const reader = page.getByRole('dialog', { name: '完整内容', exact: true });
        await expect(reader.locator('.thought-reader-text')).toHaveText(fullWords!);
        await reader.getByRole('button', { name: '回到思绪场', exact: true }).click();
        await page.screenshot({ path: testInfo.outputPath('continuation-near-source.png') });
        if (count === 1) {
            await ghosts.first().click();
            await page.getByTestId('scope-hub').getByRole('button', { name: '留下', exact: true }).click();
            await expect(ghosts).toHaveCount(0);
            await expect.poll(async () => Object.keys((await projectRecord(page)).thoughts).length).toBe(3);
            expect((await projectRecord(page)).thoughts.source).toEqual(project.thoughts.source);
        } else {
            for (let i = 0; i < count; i++) {
                await ghosts.first().click({ button: 'right' });
                await page.getByTestId('thought-menu').getByRole('menuitem', { name: '忽略', exact: true }).click();
                await expect(ghosts).toHaveCount(count - i - 1);
            }
            expect((await projectRecord(page)).thoughts).toEqual(project.thoughts);
        }
        expect(requests).toBe(1);
        expect(errors).toEqual([]);
    });
}

test('a crowded field uses a tighter visible slot before sending a continuation offscreen', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'skipped' }));
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'gateway' }));
    });
    await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Crowded placement fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text: '拥挤位置验证：边界不确定时，下一次观察的价值可能取决于它是否改变已有判断，而不只是增加输入量。'.repeat(2) }] } }));
    await page.goto('/?locale=zh');
    await expect.poll(async () => (await projectRecord(page))?.id).toBe('main');
    const now = Date.now();
    const project = createProject('main', '拥挤场位置回归', now);
    project.camera = { x: 274.243, y: 38.8764, zoom: .772874 };
    for (const [id, x, y] of [
        ['a', -165.116, 94.2344], ['b', -293.12, 395.308], ['c', 314.823, 306.809],
        ['d', 191.31, 107.329], ['e', -224.539, 823.776],
    ] as const) project.thoughts[id] = makeThought('已有想法：这个边界和输入之间还有一个尚未确认的依赖关系，需要保留当前的不确定性。'.repeat(3), { x, y }, now, id);
    project.thoughts.source = makeThought('如何区分选择质量和输入量', { x: 347.344, y: 535.776 }, now, 'source');
    project.thoughts.short = makeThought('观察', { x: -94.1409, y: 720.556 }, now, 'short');
    project.thoughts.crystal = { ...makeThought('已有结晶：同样数量的输入是否代表同样的信息，需要进一步区分。'.repeat(3), { x: 152.727, y: 737 }, now, 'crystal'), kind: 'crystal' };
    await projectRecord(page, validateProject(project));
    await page.reload();
    const source = page.locator('[data-thought-id="source"]');
    await source.click();
    const originalBoxes = await page.locator('.thought').evaluateAll(elements => Object.fromEntries(elements.map(e => [e.getAttribute('data-thought-id'), e.getAttribute('style')])));
    const camera = await page.locator('.world').evaluate(e => (e as HTMLElement).style.transform);
    await page.getByTestId('scope-continue').click();
    await page.getByRole('dialog', { name: '继续想', exact: true }).getByRole('button', { name: '1', exact: true }).click();
    await page.getByTestId('action-preview-run').click();
    const ghost = page.locator('.thought.ghost');
    await expect(ghost).toHaveCount(1);
    await expect.poll(async () => {
        const box = await ghost.boundingBox();
        return !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 898 && box.y + box.height + 32 <= 804;
    }).toBe(true);
    const box = (await ghost.boundingBox())!;
    for (const item of await page.locator('.thought:not(.ghost), .identity').all()) {
        const other = (await item.boundingBox())!;
        expect(box.x < other.x + other.width && box.x + box.width > other.x && box.y < other.y + other.height && box.y + box.height > other.y).toBe(false);
    }
    expect(await page.locator('.world').evaluate(e => (e as HTMLElement).style.transform)).toBe(camera);
    expect(await page.locator('.thought:not(.ghost)').evaluateAll(elements => Object.fromEntries(elements.map(e => [e.getAttribute('data-thought-id'), e.getAttribute('style')])))).toEqual(originalBoxes);
    expect((await projectRecord(page)).thoughts).toEqual(project.thoughts);
    await ghost.click({ button: 'right' });
    await page.getByTestId('thought-menu').getByRole('menuitem', { name: '忽略', exact: true }).click();
    await expect(ghost).toHaveCount(0);
    expect((await projectRecord(page)).thoughts).toEqual(project.thoughts);
});

test('a continuation uses a nearby corner when all centered directions are blocked', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'skipped' }));
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'gateway' }));
    });
    await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Nearby placement fixture / not live', mock: true, intents: [{ type: 'surface_possibility', text: '下一步的观察价值' }] } }));
    await page.goto('/?locale=zh');
    await expect.poll(async () => (await projectRecord(page))?.id).toBe('main');
    const now = Date.now();
    const project = createProject('main', '周围落点回归', now);
    project.camera = { x: 0, y: 0, zoom: 1 };
    for (const [id, text, x, y] of [
        ['source', '当前的观察依据', 550, 480], ['above', '已有上方想法', 550, 340],
        ['below', '已有下方想法', 550, 620], ['left', '已有左侧想法', 310, 480],
        ['right', '已有右侧想法', 790, 480],
    ] as const) project.thoughts[id] = makeThought(text, { x, y }, now, id);
    await projectRecord(page, validateProject(project));
    await page.reload();
    const source = page.locator('[data-thought-id="source"]');
    await expect(source).toBeVisible();
    const measured = await page.locator('.thought').evaluateAll(elements => Object.fromEntries(elements.map(e => {
        const b = e.getBoundingClientRect();
        return [e.getAttribute('data-thought-id'), { x: b.x, y: b.y, width: b.width, height: b.height }];
    })));
    // Use mounted card sizes to leave a 60px gap in every centered direction. Those gaps
    // cannot fit a new card, while the nearby corners and distant directions remain open.
    const origin = measured.source;
    project.thoughts.above.y = origin.y - measured.above.height - 60;
    project.thoughts.below.y = origin.y + origin.height + 60;
    project.thoughts.left.x = origin.x - measured.left.width - 60;
    project.thoughts.right.x = origin.x + origin.width + 60;
    await projectRecord(page, validateProject(project));
    await page.reload();
    await source.click();
    const before = (await source.boundingBox())!;
    const camera = await page.locator('.world').evaluate(e => (e as HTMLElement).style.transform);
    await page.getByTestId('scope-continue').click();
    await page.getByRole('dialog', { name: '继续想', exact: true }).getByRole('button', { name: '1', exact: true }).click();
    await page.getByTestId('action-preview-run').click();
    const ghost = page.locator('.thought.ghost');
    await expect(ghost).toHaveCount(1);
    await expect.poll(async () => {
        const box = await ghost.boundingBox();
        if (!box) return Infinity;
        const dx = Math.max(0, before.x - box.x - box.width, box.x - before.x - before.width);
        const dy = Math.max(0, before.y - box.y - box.height, box.y - before.y - before.height);
        return Math.hypot(dx, dy);
    }).toBeLessThanOrEqual(128);
    const box = (await ghost.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1400);
    expect(box.y + box.height + 64).toBeLessThanOrEqual(1000);
    for (const item of await page.locator('.thought:not(.ghost), .identity').all()) {
        const other = (await item.boundingBox())!;
        expect(box.x < other.x + other.width && box.x + box.width > other.x && box.y < other.y + other.height && box.y + box.height > other.y).toBe(false);
    }
    expect(await page.locator('.world').evaluate(e => (e as HTMLElement).style.transform)).toBe(camera);
    expect((await projectRecord(page)).thoughts).toEqual(project.thoughts);
    await page.screenshot({ path: testInfo.outputPath('nearby-corner-arrival.png') });
});
