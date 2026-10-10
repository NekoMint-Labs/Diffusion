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

test('selected source response controls avoid a neighboring committed card after continuation', async ({ page }, testInfo) => {
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
    await page.screenshot({ path: testInfo.outputPath('local-actions-overlap.png') });
    const responseButton = (await page.getByTestId('thought-respond').boundingBox())!;
    const neighboringCard = (await page.locator('[data-thought-id="below"]').boundingBox())!;
    const responseOverlapsCard = responseButton.x < neighboringCard.x + neighboringCard.width
        && responseButton.x + responseButton.width > neighboringCard.x
        && responseButton.y < neighboringCard.y + neighboringCard.height
        && responseButton.y + responseButton.height > neighboringCard.y;
    expect(responseOverlapsCard, 'The response control must not cover the neighboring committed wording').toBe(false);
    expect(responseButton.height).toBeGreaterThanOrEqual(32);
    await page.getByTestId('thought-respond').focus();
    await page.getByTestId('thought-respond').press('Enter');
    await expect(page.locator('.speak-references')).toContainText(project.thoughts.source.text);
    expect((await projectRecord(page)).thoughts).toEqual(project.thoughts);
    expect(await page.locator('.world').evaluate(e => (e as HTMLElement).style.transform)).toBe(camera);
});

for (const [theme, zoom, uiScale] of [['light', .4, 1], ['dark', .4, 1.2], ['dark', 1, 1]] as const) {
    test(`dense selected reading actions reserve the existing lane in ${theme}, zoom ${zoom}, UI ${uiScale}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.addInitScript(({ theme, uiScale }) => {
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'skipped' }));
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo', interfaceSize: uiScale * 100, theme, appearance: { profile: theme === 'dark' ? 'graphite-night' : 'editorial-warm' } }));
        }, { theme, uiScale });
        await page.goto('/?locale=zh');
        await expect.poll(async () => (await projectRecord(page))?.id).toBe('main');
        const now = Date.now();
        const project = createProject('main', '拥挤阅读操作', now);
        project.camera = { x: 0, y: 0, zoom };
        const text = '这条想法保留完整的原文，让阅读和回应仍然清晰可达。'.repeat(20);
        project.thoughts.source = makeThought(text, { x: 470 / zoom, y: 200 / zoom }, now, 'source');
        for (const [id, x, y] of [['above', 470, 130], ['below', 470, 360], ['left', 280, 240], ['right', 740, 240]] as const)
            project.thoughts[id] = makeThought('已有内容保持在原处。'.repeat(4), { x: x / zoom, y: y / zoom }, now, id);
        await projectRecord(page, validateProject(project));
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-interface-size', String(uiScale * 100));
        const source = page.locator('[data-thought-id="source"]');
        await source.click({ position: { x: 20, y: 20 } });
        const actions = page.locator('[data-thought-actions-for="source"]');
        await expect(actions).toHaveAttribute('data-docked', 'true');
        const transform = await page.locator('.world').getAttribute('style');
        const sourceBounds = await source.boundingBox();
        await expect(actions.getByRole('button')).toHaveCount(2);
        const read = actions.getByRole('button', { name: '阅读全文', exact: true });
        await expect.poll(async () => {
            const box = await actions.boundingBox();
            const occupied = await page.locator('.thought, .scope-hub').evaluateAll(elements => elements.map(element => {
                const b = element.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height };
            }));
            return Boolean(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1280 && box.y + box.height <= 720
                && occupied.every(b => box.x + box.width <= b.x || b.x + b.width <= box.x || box.y + box.height <= b.y || b.y + b.height <= box.y));
        }).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('dense-reading-actions.png') });
        expect((await projectRecord(page)).thoughts).toEqual(project.thoughts);
        await read.focus();
        await read.press('Enter');
        const reader = page.getByRole('dialog', { name: '完整内容', exact: true });
        await expect(reader.locator('.thought-reader-text')).toHaveText(text);
        await reader.getByRole('button', { name: '回到思绪场', exact: true }).click();
        await expect(actions).toBeVisible();
        expect(await source.boundingBox()).toEqual(sourceBounds);
        expect(await page.locator('.world').getAttribute('style')).toBe(transform);
        // Reading deliberately records existing attention/touch metadata; wording, commitment
        // and authored geometry must remain identical throughout that observation.
        const content = (thoughts: ProjectState['thoughts']) => Object.fromEntries(Object.entries(thoughts)
            .map(([id, { touchedAt, updatedAt, attentionDebt, ...thought }]) => [id, thought]));
        expect(content((await projectRecord(page)).thoughts)).toEqual(content(project.thoughts));
        await page.keyboard.press('Escape');
        await expect(actions).toHaveCount(0);
    });
}
