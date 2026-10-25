import { test, expect, type Page, type Locator } from '@playwright/test';
import type { ProjectState } from '../../src/core/model.ts';

async function boot(page: Page, locale = 'en', scale = 100, theme = 'light') {
    await page.addInitScript(({ locale, scale, theme }) => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale, interfaceSize: scale, theme, appearance: { profile: theme === 'dark' ? 'graphite-night' : 'editorial-warm' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, { locale, scale, theme });
    await page.goto(`/demo?locale=${locale}`);
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-interface-size', String(scale));
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect.poll(async () => (await stored(page)).length).toBe(1);
}

async function stored(page: Page): Promise<ProjectState[]> {
    return page.evaluate(() => new Promise<ProjectState[]>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const read = db.transaction('projects').objectStore('projects').getAll();
            read.onerror = () => { db.close(); reject(read.error); };
            read.onsuccess = () => { db.close(); resolve(read.result); };
        };
    }));
}

async function open(page: Page) {
    await page.getByTestId('field-management').click();
    const dialog = page.locator('[role="dialog"][data-surface-owner="fields"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[aria-current="true"]')).toHaveCount(1);
    await expect(dialog).toBeFocused();
    return dialog;
}

for (const locale of ['en', 'zh']) {
    test(`one entry creates, duplicates, switches and reopens independent Fields: ${locale}`, async ({ page }) => {
        await boot(page, locale);
        const [original] = await stored(page);
        let dialog = await open(page);
        const duplicateLabel = locale === 'zh' ? '复制当前思绪场' : 'Duplicate current Field';
        const createLabel = locale === 'zh' ? '新建思绪场' : 'New Field';
        await expect(dialog.locator('[aria-current="true"]')).toContainText(locale === 'zh' ? '当前思绪场' : 'Current Field');
        await expect(dialog.locator('[aria-current="true"] button')).toHaveCount(0);
        await dialog.getByRole('button', { name: duplicateLabel, exact: true }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect.poll(() => page.evaluate(() => localStorage.getItem('diffusion-active-project'))).toMatch(/^field/);
        const copyId = (await page.evaluate(() => localStorage.getItem('diffusion-active-project')))!;
        const copy = (await stored(page)).find(p => p.id === copyId)!;
        expect(copy.id).not.toBe(original.id);
        for (const key of ['thoughts', 'relations', 'regions', 'sources', 'threads', 'history'] as const)
            expect(copy[key]).toEqual(original[key]);
        await expect(page.getByTestId('field-title')).toHaveText(copy.title);

        // Editing uses the unchanged title menu; the copy's title must not rename its source.
        await page.getByTestId('field-title').click();
        await page.getByTestId('field-menu').locator('[data-command="rename-field"]').click();
        await expect(page.getByTestId('field-management')).toHaveCount(0);
        await page.getByTestId('field-rename').fill(`Independent copy ${locale}`);
        await page.getByTestId('field-rename').press('Enter');
        await expect(page.getByTestId('field-title')).toHaveText(`Independent copy ${locale}`);
        dialog = await open(page);
        await dialog.getByRole('button', { name: createLabel, exact: true }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect.poll(() => page.evaluate(() => localStorage.getItem('diffusion-active-project'))).not.toBe(copyId);
        const newId = (await page.evaluate(() => localStorage.getItem('diffusion-active-project')))!;
        expect(newId).not.toBe('demo');
        expect(Object.keys((await stored(page)).find(p => p.id === newId)!.thoughts)).toHaveLength(0);
        dialog = await open(page);
        await expect(dialog.locator('.field-list li')).toHaveCount(3);
        await dialog.locator('button[data-field="demo"]').click();
        await expect(page.getByTestId('field-title')).toHaveText(locale === 'zh' ? '安静，不是空无' : original.title);
        const restored = (await stored(page)).find(p => p.id === 'demo')!;
        expect(restored).toEqual(original);
        dialog = await open(page);
        await dialog.locator(`button[data-field="${copyId}"]`).click();
        await expect(page.getByTestId('field-title')).toHaveText(`Independent copy ${locale}`);
        await expect.poll(() => page.evaluate(() => localStorage.getItem('diffusion-active-project'))).toBe(copyId);
        await page.goto(`/?locale=${locale}`);
        await expect(page.getByTestId('field-title')).toHaveText(`Independent copy ${locale}`);
        const reopened = (await stored(page)).find(p => p.id === copyId)!;
        expect(reopened.thoughts).toEqual(original.thoughts);
        expect(reopened.relations).toEqual(original.relations);
        expect(reopened.regions).toEqual(original.regions);
    });
}

test('management shares keyboard focus, IME Escape and unfinished writing ownership', async ({ page }) => {
    await boot(page, 'zh');
    const camera = (await stored(page))[0].camera;
    await page.getByTestId('field-management').focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('[role="dialog"][data-surface-owner="fields"]');
    await expect(dialog).toBeFocused();
    for (const state of [{ isComposing: true }, { keyCode: 229 }]) {
        await dialog.dispatchEvent('compositionstart', { data: '中' });
        await dialog.dispatchEvent('keydown', { key: 'Escape', bubbles: true, ...state });
        await expect(dialog).toBeVisible();
        await dialog.dispatchEvent('compositionend', { data: '' });
    }
    for (let i = 0; i < 8; i++) {
        await page.keyboard.press(i < 4 ? 'Tab' : 'Shift+Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('field-management')).toBeFocused();
    expect((await stored(page))[0].camera).toEqual(camera);
    const speak = page.locator('[data-testid="speak"] textarea');
    await speak.fill('还没有完成的中文草稿');
    await open(page);
    await expect(speak).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(speak).toHaveValue('还没有完成的中文草稿');
    await expect(page.getByTestId('field-management')).toBeFocused();
});

test('an exiting management surface does not consume its successor Escape', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
    await boot(page);
    const dialog = await open(page);
    await page.clock.pauseAt(new Date('2026-01-01T10:00:00Z'));
    await page.keyboard.press('Escape');
    await page.clock.runFor(32);
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-surface-owner="fields"][inert]')).toHaveCount(1);
    await page.getByTestId('field-management').click();
    await page.clock.runFor(32);
    await expect(dialog).toBeFocused();
    await page.keyboard.press('Escape');
    await page.clock.runFor(32);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('field-management')).toBeFocused();
});

for (const action of ['create', 'duplicate', 'switch'] as const) {
    test(`refused ${action} keeps the original Field and reports the failure`, async ({ page }) => {
        await boot(page);
        const original = (await stored(page))[0];
        // This injects a browser storage failure in disposable test data, never an app profile.
        if (action === 'switch') {
            const dialog = await open(page);
            await dialog.getByRole('button', { name: 'Duplicate current Field', exact: true }).click();
            await expect(page.getByRole('dialog')).toHaveCount(0);
            await expect.poll(() => page.evaluate(() => localStorage.getItem('diffusion-active-project'))).toMatch(/^field/);
            const copyId = (await page.evaluate(() => localStorage.getItem('diffusion-active-project')))!;
            const copyDialog = await open(page);
            await copyDialog.locator('button[data-field="demo"]').click();
            await expect(page.getByTestId('field-title')).toHaveText(original.title);
            await expect.poll(() => page.evaluate(() => localStorage.getItem('diffusion-active-project'))).toBe('demo');
            await page.evaluate(copyId => {
                const get = IDBObjectStore.prototype.get;
                IDBObjectStore.prototype.get = function (key) {
                    if (this.name === 'projects' && key === copyId) throw new DOMException('Injected read failure', 'UnknownError');
                    return get.call(this, key);
                };
            }, copyId);
            const nextDialog = await open(page);
            await nextDialog.locator(`button[data-field="${copyId}"]`).click();
        } else {
            await page.evaluate(() => {
                const put = IDBObjectStore.prototype.put;
                IDBObjectStore.prototype.put = function (value, key) {
                    if (this.name === 'projects' && value.id !== 'demo') throw new DOMException('Injected save failure', 'QuotaExceededError');
                    return key === undefined ? put.call(this, value) : put.call(this, value, key);
                };
            });
            const dialog = await open(page);
            await dialog.getByRole('button', { name: action === 'create' ? 'New Field' : 'Duplicate current Field', exact: true }).click();
        }
        await expect(page.locator('.notice[data-tone="error"]')).toBeVisible();
        await expect(page.getByTestId('field-title')).toHaveText(original.title);
        expect((await stored(page)).find(p => p.id === 'demo')).toEqual(original);
        expect(await page.evaluate(() => localStorage.getItem('diffusion-active-project'))).toBe(action === 'switch' ? 'demo' : null);
        if (action !== 'switch') expect(await stored(page)).toHaveLength(1);
    });
}

async function insideViewport(page: Page, locator: Locator) {
    const box = (await locator.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

for (const [width, locale, scale, theme] of [[1280, 'en', 100, 'light'], [720, 'zh', 110, 'dark'], [360, 'zh', 120, 'light']] as const) {
    test(`entry and existing surface fit ${width}px / ${locale} / ${scale}%`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 720 });
        await boot(page, locale, scale, theme);
        await insideViewport(page, page.getByTestId('field-management'));
        const title = (await page.getByTestId('field-title').boundingBox())!;
        const entry = (await page.getByTestId('field-management').boundingBox())!;
        expect(title.x + title.width <= entry.x || entry.x + entry.width <= title.x || title.y + title.height <= entry.y || entry.y + entry.height <= title.y).toBe(true);
        const closed = testInfo.outputPath('management-entry.png');
        await page.screenshot({ path: closed });
        await testInfo.attach('management entry', { path: closed, contentType: 'image/png' });
        const dialog = await open(page);
        await insideViewport(page, dialog);
        for (const button of await dialog.locator('.field-management-actions button').all()) await insideViewport(page, button);
        expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        const opened = testInfo.outputPath('management-surface.png');
        await page.screenshot({ path: opened });
        await testInfo.attach('existing management surface', { path: opened, contentType: 'image/png' });
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('field-management')).toBeFocused();
    });
}
