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
        const transform = await page.locator('.world').evaluate(element => (element as HTMLElement).style.transform);
        await page.getByTestId('scope-continue').click();
        const preview = page.getByRole('dialog', { name: '继续想', exact: true });
        await preview.getByRole('button', { name: String(count), exact: true }).click();
        await page.getByTestId('action-preview-run').click();
        await expect.poll(() => requests).toBe(1);
        await expect(page.getByRole('status')).toContainText('继续');
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
        expect(await source.boundingBox()).toEqual(before);
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
