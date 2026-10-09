import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });

async function boot(page: Page, theme: 'light' | 'dark', zoom: number, provider = 'demo', crowded = false) {
    await page.addInitScript(({ theme, provider }) => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider, theme, appearance: { profile: theme === 'dark' ? 'graphite-night' : 'editorial-warm' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, { theme, provider });
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', '建议位置回归');
    project.camera = { x: 0, y: 0, zoom };
    project.thoughts.source = makeThought('我想了解怎样安排课程学习，才能在有限时间里继续探索自己的方向。', { x: 850 / zoom, y: 390 / zoom }, 1, 'source');
    project.thoughts.other = makeThought('已有内容的位置应当保持不变。', { x: 380 / zoom, y: 260 / zoom }, 1, 'other');
    if (crowded) {
        project.thoughts.other = makeThought('稀疏视角重建和智能体的结合', { x: 190, y: 310 }, 1, 'other');
        project.thoughts.source = { ...makeThought('如果智能体不只是拿来后处理重建结果，而是让它决定下一张图从哪里拍，稀疏视角的问题就从给多少张变成接下来该看哪里，闭环采集和离线重建是两件不同的事。'.repeat(2), { x: 153, y: 415 }, 1, 'source'), derivedFrom: ['other'], generationAction: 'continue' };
    }
    await page.evaluate(project => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result, tx = db.transaction('projects', 'readwrite');
            tx.objectStore('projects').put(project);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        };
    }), project);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-style-profile', theme === 'dark' ? 'graphite-night' : 'editorial-warm');
    await expect(page.locator('[data-thought-id="source"]')).toBeVisible();
    return project;
}

test.describe('crowded measured arrivals', () => {
    test.use({ viewport: { width: 898, height: 804 } });
    for (const theme of ['light', 'dark'] as const) test('three long automatic proposals fit together in ' + theme, async ({ page }, info) => {
        const suggestions = [
            '位置验证示例1：可以先用固定标定板比较相邻视角的误差分布，检查低纹理区域是否持续缺少约束；随后只选择一组最容易复现的室内场景，观察新增视角对局部结构的影响，避免一次改变多个条件。',
            '位置验证示例2：设备端可以保留每次拍摄的曝光、镜头参数和时间戳，并在离线处理前检查重复帧与模糊图像；如果原始记录不完整，就先补齐采集日志，再比较不同重建程序的表现。',
            '位置验证示例3：评价过程可以提前约定一组未参与训练的物体，以及人工测量得到的尺寸参考；把结构偏差和运行成本分别列出，留意某个方案是否只在单一场景占优，再决定后续实验顺序。',
        ];
        await page.route('**/api/respond', route => route.fulfill({ json: { providerLabel: 'Placement fixture / not live', mock: true, intents: suggestions.map(text => ({ type: 'surface_possibility', text })) } }));
        await boot(page, theme, .8, 'gateway', true);
        const source = page.locator('[data-thought-id="source"]'), other = page.locator('[data-thought-id="other"]');
        const beforeSource = await source.getAttribute('style'), beforeOther = await other.getAttribute('style'), camera = await page.locator('.world').getAttribute('style');
        await source.click(); await page.getByTestId('scope-continue').click();
        await page.getByRole('dialog', { name: '继续想', exact: true }).getByRole('button', { name: '3', exact: true }).click();
        await page.getByTestId('action-preview-run').click();
        const ghosts = page.locator('article.ghost');
        await expect(ghosts).toHaveCount(3); await expect(page.getByTestId('operation-feedback')).toHaveCount(0);
        await expect.poll(async () => {
            const boxes = await ghosts.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().toJSON()));
            return boxes.every((box, index) => box.x >= 0 && box.y >= 0 && box.right <= 898 && box.bottom + 64 <= 804 && boxes.slice(0, index).every(other => box.x >= other.right || box.right <= other.x || box.y >= other.bottom || box.bottom <= other.y));
        }).toBe(true);
        await expect(source).toHaveAttribute('style', beforeSource!); await expect(other).toHaveAttribute('style', beforeOther!);
        await expect(page.locator('.world')).toHaveAttribute('style', camera!);
        await page.screenshot({ path: info.outputPath('crowded-' + theme + '.png') });
    });

    test('a later Continue request preserves already displayed same-scope proposals', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 960 });
        let requests = 0;
        await page.route('**/api/respond', route => {
            requests++;
            const texts = requests === 1 ? ['先记录这一个观察，保持它的位置。'] : [
                '下一轮先用标定板比较不同视角的误差分布，检查低纹理区域是否持续缺少约束；然后选择最容易复现的场景，观察新增视角对结构的影响。',
                '设备可以保留每次拍摄的曝光、镜头参数和时间戳，处理前检查重复帧和模糊图像；如果原始记录不完整，就先补齐采集日志。',
                '评价可以约定未参与训练的物体和人工测量的尺寸参考，把结构偏差与运行成本分别列出，再决定后续实验顺序。',
            ];
            return route.fulfill({ json: { providerLabel: 'Separate requests / not live', mock: true, intents: texts.map(text => ({ type: 'surface_possibility', text })) } });
        });
        await boot(page, 'light', .8, 'gateway', true);
        const source = page.locator('[data-thought-id="source"]');
        await source.click(); await page.getByTestId('scope-continue').click();
        await page.getByTestId('action-preview-run').click();
        const ghosts = page.locator('article.ghost');
        await expect(ghosts).toHaveCount(1);
        await expect(page.getByTestId('operation-feedback')).toHaveCount(0);
        const oldId = (await ghosts.first().getAttribute('data-thought-id'))!;
        const old = page.locator('[data-thought-id="' + oldId + '"]');
        const before = await old.getAttribute('style');
        await source.click(); await page.getByTestId('scope-continue').click();
        await page.getByRole('dialog', { name: '继续想', exact: true }).getByRole('button', { name: '3', exact: true }).click();
        await page.getByTestId('action-preview-run').click();
        await expect(ghosts).toHaveCount(4);
        await expect(page.getByTestId('operation-feedback')).toHaveCount(0);
        // Force another measured reading layout after both independent requests complete.
        await page.setViewportSize({ width: 860, height: 760 });
        await expect(old).toHaveAttribute('style', before!);
        await source.click();
        await expect(old).toHaveAttribute('style', before!);
        expect(requests).toBe(2);
    });
});

test('camera travel and remeasurement keep the world position when the source is offscreen', async ({ page }) => {
    await boot(page, 'light', 1);
    await page.locator('[data-thought-id="source"]').click();
    await page.getByTestId('scope-continue').click(); await page.getByTestId('action-preview-run').click();
    const ghosts = page.locator('article.ghost');
    await expect(ghosts.first()).toBeVisible(); await expect(page.getByTestId('operation-feedback')).toHaveCount(0);
    // Camera/culling can reorder mounted siblings. Follow one stable identity at the left edge.
    const id = await ghosts.evaluateAll(elements => elements.map(element => ({ id: (element as HTMLElement).dataset.thoughtId!, x: element.getBoundingClientRect().x })).sort((a, b) => a.x - b.x)[0].id);
    const ghost = page.locator('[data-thought-id="' + id + '"]');
    const before = await ghost.getAttribute('style');
    const field = page.getByTestId('field');
    await field.focus(); await page.keyboard.down('Space');
    await page.mouse.move(640, 600); await page.mouse.down();
    await page.mouse.move(1190, 600, { steps: 12 }); await page.mouse.up(); await page.keyboard.up('Space');
    await expect.poll(async () => {
        const source = await page.locator('[data-thought-id="source"]').boundingBox();
        return !source || source.x >= 1280;
    }).toBe(true);
    await page.setViewportSize({ width: 1100, height: 680 });
    await page.mouse.move(1000, 620); await page.mouse.wheel(0, 80);
    await expect(field).not.toHaveAttribute('data-camera-moving', 'true');
    await expect(ghost).toHaveAttribute('style', before!);
});

for (const theme of ['light', 'dark'] as const) for (const zoom of [1, .55]) {
    test('new proposal is visible near its source and Keep preserves it: ' + theme + ', zoom ' + zoom, async ({ page }, info) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        const project = await boot(page, theme, zoom);
        const source = page.locator('[data-thought-id="source"]');
        const other = page.locator('[data-thought-id="other"]');
        const sourcePosition = await source.getAttribute('style'), otherPosition = await other.getAttribute('style');
        const camera = await page.locator('.world').getAttribute('style');
        await source.click();
        await page.getByTestId('scope-continue').click();
        await page.getByTestId('action-preview-run').click();
        const ghost = page.locator('article.ghost').first();
        await expect(ghost).toBeVisible();
        await expect(page.getByTestId('operation-feedback')).toHaveCount(0);
        const id = (await ghost.getAttribute('data-thought-id'))!;
        const placed = page.locator('[data-thought-id="' + id + '"]');
        await expect.poll(async () => {
            const a = (await source.boundingBox())!, b = (await placed.boundingBox())!;
            const dx = Math.max(0, a.x - b.x - b.width, b.x - a.x - a.width);
            const dy = Math.max(0, a.y - b.y - b.height, b.y - a.y - a.height);
            return b.x >= 0 && b.y >= 0 && b.x + b.width <= 1280 && b.y + b.height <= 720 && (dx > 0 || dy > 0) && Math.hypot(dx, dy) <= 216;
        }).toBe(true);
        await expect(source).toHaveAttribute('style', sourcePosition!);
        await expect(other).toHaveAttribute('style', otherPosition!);
        await expect(page.locator('.world')).toHaveAttribute('style', camera!);
        const beforeSelection = await placed.getAttribute('style');
        await placed.click();
        await expect(placed).toHaveAttribute('data-selected', 'true');
        // Selection changes the measured reading box; record Keep only after correction settles.
        let lastStyle = '', stableSince = Date.now();
        await expect.poll(async () => {
            const style = (await placed.getAttribute('style'))!;
            if (style !== lastStyle) { lastStyle = style; stableSince = Date.now(); }
            return Date.now() - stableSince >= 200;
        }).toBe(true);
        await expect(placed).toHaveAttribute('style', beforeSelection!);
        const beforeKeep = await placed.getAttribute('style');
        await page.screenshot({ path: info.outputPath('nearby-' + theme + '-' + zoom + '.png') });
        await page.getByTestId('ai-proposal-keep').click();
        await expect(placed).not.toHaveClass(/ghost/);
        await expect(placed).toHaveAttribute('style', beforeKeep!);
        await expect(source).toHaveAttribute('style', sourcePosition!);
        await expect(page.locator('.world')).toHaveAttribute('style', camera!);
        await expect.poll(() => page.evaluate(id => new Promise<boolean>(resolve => {
            const request = indexedDB.open('diffusion-explorer-v1');
            request.onsuccess = () => {
                const db = request.result, get = db.transaction('projects').objectStore('projects').get('main');
                get.onsuccess = () => { db.close(); resolve(!!get.result?.thoughts[id]); };
            };
        }), id)).toBe(true);
        await page.reload();
        await expect(placed).toBeVisible();
        await expect(source).toContainText(project.thoughts.source.text);
        await expect(page.locator('article.ghost')).toHaveCount(0);
        expect(errors).toEqual([]);
    });
}
