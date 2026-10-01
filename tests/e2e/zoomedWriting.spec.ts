import { test, expect, type Page } from '@playwright/test';

async function zoomOut(page: Page, level: 'atlas' | 'neighborhood') {
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.mouse.move(700, 400);
    for (let step = 0; step < (level === 'atlas' ? 8 : 2); step++) {
        await page.mouse.wheel(0, 240);
        await page.waitForTimeout(40);
    }
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', level);
    await expect.poll(() => page.getByTestId('field').getAttribute('data-camera-moving')).toBeNull();
}

for (const level of ['atlas', 'neighborhood'] as const) {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
        test.describe(`${level} writing with ${reducedMotion}`, () => {
            test.use({ viewport: { width: 1280, height: 960 }, reducedMotion });
            test('new Chinese wording keeps a readable editor before commitment', async ({ page }, testInfo) => {
                await page.addInitScript(profile => localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', appearance: { profile } })), reducedMotion === 'reduce' ? 'graphite-night' : 'editorial-warm');
                await zoomOut(page, level);
                const camera = await page.locator('.world').getAttribute('style');
                await page.getByTestId('field').dblclick({ position: { x: 360, y: 320 } });
                const editor = page.locator('.thought.editing textarea');
                await expect(editor).toBeFocused();
                await expect(editor).toHaveCSS('transform', 'none');
                const initialWidth = (await editor.boundingBox())!.width;
                expect(initialWidth, 'new text must have a readable screen width at every zoom').toBeGreaterThan(130);
                await editor.pressSequentially('我想做一个帮助大学生整理学习资料的工具');
                await editor.press('Shift+Enter');
                await editor.pressSequentially('希望支持按课程分类');
                await editor.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
                await expect(editor).toBeFocused();
                const draft = await editor.inputValue();
                expect(draft).toContain('\n');
                const inputBox = (await editor.boundingBox())!;
                expect(inputBox.width).toBeCloseTo(initialWidth, 0);
                expect(await editor.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
                expect(await editor.evaluate(el => el.scrollHeight - el.clientHeight), 'short multiline drafts do not collapse into a clipped strip').toBeLessThanOrEqual(1);
                await page.screenshot({ path: testInfo.outputPath('editing.png') });
                await editor.press('Enter');
                const thought = page.locator('article.thought').filter({ hasText: draft });
                await expect(thought).toBeVisible();
                await thought.dblclick();
                await expect(editor).toHaveValue(draft);
                await editor.fill('取消这次修改');
                await editor.press('Escape');
                await expect(thought).toHaveText(draft);
                expect(await page.locator('.world').getAttribute('style')).toBe(camera);
            });
        });
    }
}

test('sparse Atlas keeps both Thoughts after deselection, Find and reload', async ({ page }, testInfo) => {
    await zoomOut(page, 'atlas');
    const camera = await page.locator('.world').getAttribute('style');
    const place = async (words: string, x: number, y: number) => {
        await page.getByTestId('field').dblclick({ position: { x, y } });
        const editor = page.locator('.thought.editing textarea');
        await editor.fill(words);
        await editor.press('Enter');
        return page.locator('article.thought').filter({ hasText: words });
    };
    const first = await place('我想做一个', 300, 340);
    const second = await place('希望支持按课程分类', 720, 550);
    await page.getByTestId('field').click({ position: { x: 180, y: 180 } });
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();
    for (const words of ['我想做一个', '希望支持按课程分类']) {
        await page.keyboard.press('Control+f');
        await page.locator('.find-bar input').fill(words);
        await expect(page.getByTestId('find-status')).toHaveText('1 / 1');
        await expect(page.locator('article.thought[data-find="current"]')).toContainText(words);
        await page.keyboard.press('Escape');
        await expect(first).toBeVisible();
        await expect(second).toBeVisible();
    }
    expect(await page.locator('.world').getAttribute('style')).toBe(camera);
    await page.screenshot({ path: testInfo.outputPath('both-after-find.png') });
    await expect.poll(() => page.evaluate(() => new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const read = db.transaction('projects').objectStore('projects').get('main');
            read.onsuccess = () => { resolve(Object.keys(read.result?.thoughts ?? {}).length); db.close(); };
        };
    }))).toBe(2);
    await page.reload();
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();
    // Reopen while the items are offscreen: their geometry caches have not been measured yet.
    await page.mouse.move(100, 700);
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1900, 700, { steps: 5 });
    await page.mouse.up({ button: 'middle' });
    await expect(second).toHaveCount(0);
    await expect.poll(() => page.getByTestId('field').getAttribute('data-camera-moving')).toBeNull();
    const pannedX = await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41);
    await expect.poll(() => page.evaluate(() => new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const read = db.transaction('projects').objectStore('projects').get('main');
            read.onsuccess = () => { resolve(read.result?.camera.x); db.close(); };
        };
    }))).toBeCloseTo(pannedX, 1);
    await page.reload();
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(second).toHaveCount(0);
    const beforeFind = await page.locator('.world').getAttribute('style');
    // Explicit Find navigation centers the hit at the existing zoom; typing never moves the camera.
    await page.keyboard.press('Control+f');
    const query = page.locator('.find-bar input');
    await query.fill('希望支持按课程分类');
    await query.press('Enter');
    await expect.poll(async () => {
        const box = await second.boundingBox();
        return box ? Math.abs(box.x + box.width / 2 - 720) : Infinity;
    }).toBeLessThan(2);
    await page.keyboard.press('Escape');
    // Closing Find restores its original viewpoint, including an intentionally empty area.
    await expect(page.locator('.world')).toHaveAttribute('style', beforeFind!);
    await expect(second).toHaveCount(0);
});


test('Find discloses an ordinary Thought in dense Atlas without weakening the detail cap', async ({ page }) => {
    await page.goto('/perf?count=5000&locale=zh');
    const thought = page.locator('[data-thought-id="p-1"]');
    await expect(thought).toBeVisible();
    await thought.dblclick();
    const editor = page.locator('.thought.editing textarea');
    await editor.fill('远景中也能找到这一条独特想法');
    await editor.press('Enter');
    await page.keyboard.press('Escape');
    await page.mouse.move(700, 400);
    for (let step = 0; step < 8; step++) {
        await page.mouse.wheel(0, 240);
        await page.waitForTimeout(40);
    }
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
    // Acceptance now preserves authored roots. Dense views retain readable boxes up to the
    // existing cap plus exact compact anchors and a searchable entry for suppressed roots.
    expect(await page.locator('article[data-kind="thought"]').count()).toBeLessThanOrEqual(64);
    await expect(page.getByTestId('root-anchors')).toBeVisible();
    await expect(page.getByTestId('root-review-toggle')).toBeVisible();
    const camera = await page.locator('.world').getAttribute('style');
    await page.keyboard.press('Control+f');
    await page.locator('.find-bar input').fill('远景中也能找到这一条独特想法');
    await expect(page.getByTestId('find-status')).toHaveText('1 / 1');
    await expect(thought).toBeVisible();
    await expect(thought).toHaveAttribute('data-find', 'current');
    expect(await page.locator('article.thought').count()).toBeLessThanOrEqual(64);
    expect(await page.locator('.world').getAttribute('style')).toBe(camera);
    await page.keyboard.press('Escape');
    await page.getByTestId('root-review-toggle').click();
    const entry = page.locator('.root-review .suggestion-review-list button').first();
    const wording = (await entry.innerText()).trim();
    await entry.click();
    await expect(page.locator('article.thought').filter({ hasText: wording }).first()).toBeVisible();
});
