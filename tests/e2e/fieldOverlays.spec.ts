import { test, expect, type Page, type Locator } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
async function clearOf(control: Locator, content: Locator) {
    await expect.poll(async () => {
        const a = await control.boundingBox(), b = await content.boundingBox();
        return a && b ? overlap(a, b) : true;
    }).toBe(false);
}
async function configured(page: Page, locale = 'zh') {
    await page.addInitScript(locale => localStorage.setItem('diffusion-settings', JSON.stringify({ locale, provider: 'compatible', baseUrl: 'http://127.0.0.1:11434/v1', model: 'fixture', interfaceSize: 120 })), locale);
    await page.goto(`/demo?locale=${locale}`);
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
}
async function start(page: Page) {
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('scope-continue').click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.getByTestId('operation-feedback')).toHaveAttribute('data-copy-visible', 'true');
}
function holdModel(page: Page) {
    let release!: () => void;
    const promise = new Promise<void>(resolve => { release = resolve; });
    const routing = page.route('http://127.0.0.1:11434/**', async route => {
        await promise;
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"message":"fixture unavailable"}}' }).catch(() => {});
    });
    return { release, routing };
}

for (const scale of [1, 1.25, 1.5]) {
    test.describe(`measured controls at scale ${scale}`, () => {
        test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale, reducedMotion: scale === 1.5 ? 'reduce' : 'no-preference' });
        test('running feedback stays clear, readable and bound to the original scope', async ({ page }, testInfo) => {
            const model = holdModel(page); await model.routing;
            try {
                await configured(page);
                await start(page);
                const feedback = page.getByTestId('operation-feedback');
                const source = page.locator('[data-thought-id="attention"]');
                await clearOf(feedback, source);
                await clearOf(page.getByTestId('scope-hub'), source);
                await clearOf(feedback, page.getByTestId('scope-hub'));
                const width = (await feedback.boundingBox())!.width;
                await page.locator('[data-thought-id="structure"]').click();
                await expect(feedback).toHaveAttribute('data-origin-scope', 'attention');
                await clearOf(feedback, source);
                await page.mouse.move(1000, 450);
                await page.mouse.wheel(0, 100);
                await expect(page.getByTestId('field')).not.toHaveAttribute('data-camera-moving', 'true');
                await expect.poll(async () => Math.abs((await feedback.boundingBox())!.width - width)).toBeLessThan(1);
                await clearOf(feedback, source);
                await page.screenshot({ path: testInfo.outputPath('running-and-new-selection.png') });
                await feedback.getByRole('button', { name: '停止', exact: true }).click();
                await expect(feedback).toHaveAttribute('data-phase', 'cancelled');
                model.release();
                await expect(page.locator('.thought.ghost')).toHaveCount(0);
            } finally { model.release(); }
        });
    });
}

test('a scope with no free side uses a reserved lane without moving Thoughts', async ({ page }, testInfo) => {
    await configured(page, 'en');
    await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('diffusion-explorer-v1'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('projects', 'readwrite'), store = tx.objectStore('projects'), request = store.get('demo');
            request.onsuccess = () => {
                const project = request.result;
                project.camera = { x: 0, y: 0, zoom: 1 };
                Object.assign(project.thoughts.attention, { x: 400, y: 20 });
                Object.assign(project.thoughts.structure, { x: 940, y: 625 });
                Object.assign(project.thoughts.quiet, { x: 90, y: 300 });
                store.put(project);
            };
            tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
        }); db.close();
    });
    await page.reload();
    const source = page.locator('[data-thought-id="attention"]');
    const target = page.locator('[data-thought-id="structure"]');
    await source.click(); await target.click({ modifiers: ['Shift'] });
    const positions = await page.locator('.thought').evaluateAll(items => items.map(item => [item.getAttribute('data-thought-id'), (item as HTMLElement).style.transform]));
    const hub = page.getByTestId('scope-hub');
    await expect(hub).toHaveAttribute('data-docked', 'true');
    await expect.poll(async () => (await hub.boundingBox())!.y - ((await page.getByTestId('field').boundingBox())!.y + (await page.getByTestId('field').boundingBox())!.height)).toBeGreaterThanOrEqual(0);
    await expect(hub.getByTestId('thought-more')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('reserved-lane.png') });
    expect(await page.locator('.thought').evaluateAll(items => items.map(item => [item.getAttribute('data-thought-id'), (item as HTMLElement).style.transform]))).toEqual(positions);
    await page.keyboard.press('Escape');
    await expect(hub).toHaveCount(0);
    await page.getByTestId('progressive-tutorial-coach').getByRole('button', { name: 'Got it' }).click();
    await expect.poll(async () => (await page.getByTestId('field').boundingBox())!.height).toBe(720);
});

test('a failed request can leave feedback without blocking the original Thought', async ({ page }) => {
    const model = holdModel(page); await model.routing;
    try {
        await configured(page, 'en'); await start(page);
        model.release();
        await expect(page.getByTestId('operation-feedback')).toHaveAttribute('data-phase', 'failed');
        await expect(page.getByTestId('operation-feedback').getByRole('button')).toHaveCount(0);
        await expect(page.locator('.notice')).toBeVisible();
        await page.locator('[data-thought-id="attention"]').dblclick();
        await expect(page.getByRole('textbox', { name: 'Edit thought' })).toBeFocused();
    } finally { model.release(); }
});


test('a valid response arriving after Stop cannot replace a newer request', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let finished!: () => void;
    const lateDelivered = new Promise<void>(resolve => { finished = resolve; });
    let requests = 0;
    await page.route('**/api/respond', async route => {
        const first = ++requests === 1;
        if (first) await gate;
        await route.fulfill({ json: { providerLabel: 'E2E fixture', mock: true, intents: [{ type: 'surface_possibility', text: first ? 'Late cancelled possibility' : 'Current possibility' }] } }).catch(() => {});
        if (first) finished();
    });
    try {
        await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'gateway' })));
        await page.goto('/demo?locale=en');
        const ask = async () => {
            await page.locator('[data-thought-id="attention"]').click();
            await page.getByTestId('thought-more').click();
            await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
            const input = page.getByRole('textbox', { name: 'Speak', exact: true });
            await input.fill('Explore this thought');
            await input.press('Enter');
        };
        await ask();
        await expect(page.getByTestId('operation-feedback')).toHaveAttribute('data-copy-visible', 'true');
        await page.getByTestId('operation-feedback').getByRole('button', { name: 'Stop', exact: true }).click();
        await ask();
        await expect(page.locator('article.ghost').filter({ hasText: 'Current possibility' })).toBeVisible();
        release();
        await lateDelivered;
        await expect(page.locator('article.ghost')).toHaveCount(1);
        await expect(page.locator('article.ghost')).toContainText('Current possibility');
        await expect(page.locator('article.ghost').filter({ hasText: 'Late cancelled possibility' })).toHaveCount(0);
    } finally { release(); }
});

test('one-time multi-selection coaching reserves space and releases it on dismissal', async ({ page }, testInfo) => {
    await page.goto('/demo?locale=en');
    const source = page.locator('[data-thought-id="attention"]');
    await expect(source).toBeVisible();
    const before = await source.evaluate(el => (el as HTMLElement).style.transform);
    await source.click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    const coach = page.getByTestId('progressive-tutorial-coach');
    await expect(coach).toBeVisible();
    await clearOf(coach, page.getByTestId('field'));
    await clearOf(coach, page.getByTestId('scope-hub'));
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('speak')).toBeVisible();
    await clearOf(coach, page.getByTestId('speak'));
    await page.screenshot({ path: testInfo.outputPath('coaching-reserved-lane.png') });
    const height = (await page.getByTestId('field').boundingBox())!.height;
    await coach.getByRole('button', { name: 'Got it' }).click();
    await expect(coach).toHaveCount(0);
    await expect.poll(async () => (await page.getByTestId('field').boundingBox())!.height).toBeGreaterThan(height);
    await expect.poll(async () => (await page.getByTestId('field').boundingBox())!.height).toBe(720);
    expect(await source.evaluate(el => (el as HTMLElement).style.transform)).toEqual(before);
});


test.describe('terminal feedback distinguishes output from deadlines', () => {
    test.use({ reducedMotion: 'reduce' });

    test('an empty response reports zero results and keeps readable feedback', async ({ page }, testInfo) => {
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        await page.route('**/api/respond', async route => {
            await gate;
            await route.fulfill({ json: { providerLabel: 'E2E fixture', mock: false, intents: [] } });
        });
        try {
            await page.clock.install();
            await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'gateway' })));
            await page.goto('/demo?locale=en');
            await start(page);
            release();
            const feedback = page.getByTestId('operation-feedback');
            await expect(feedback).toHaveAttribute('data-phase', 'completed');
            await expect(feedback).toContainText('0 results · Continue');
            await expect(page.locator('.notice')).toContainText('No new suggestion was surfaced this time.');
            await expect(page.locator('.thought.ghost')).toHaveCount(0);
            await page.clock.fastForward(1000);
            await expect(feedback).toBeVisible();
            await page.screenshot({ path: testInfo.outputPath('empty-result-feedback.png') });
        } finally { release(); }
    });

    test('a deadline reports failure rather than Stop and retains readable feedback', async ({ page }, testInfo) => {
        const model = holdModel(page); await model.routing;
        try {
            await page.clock.install();
            await configured(page, 'en');
            await start(page);
            await page.clock.fastForward(45000);
            const feedback = page.getByTestId('operation-feedback');
            await expect(feedback).toHaveAttribute('data-phase', 'failed');
            await expect(feedback).toContainText('This action did not finish.');
            await expect(feedback).not.toContainText('Stopped.');
            await expect(page.locator('.notice')).toContainText('did not answer in time.');
            await expect(page.locator('.thought.ghost')).toHaveCount(0);
            await page.clock.fastForward(2000);
            await expect(feedback).toBeVisible();
            await page.screenshot({ path: testInfo.outputPath('timeout-feedback.png') });
            await page.locator('[data-thought-id="attention"]').dblclick();
            await expect(page.getByRole('textbox', { name: 'Edit thought' })).toBeFocused();
        } finally { model.release(); }
    });
});
