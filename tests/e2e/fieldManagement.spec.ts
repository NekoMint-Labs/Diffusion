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
    await boot(page);
    await page.clock.install();
    const dialog = await open(page);
    // pauseAt must target the future: a sampled "now" is already past after the protocol hop.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
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

for (const locale of ['en', 'zh']) {
    test(`deleting the last Field requires confirmation and reopens an independent empty Field: ${locale}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 720, height: 720 });
        await boot(page, locale, 110, locale === 'zh' ? 'dark' : 'light');
        const [original] = await stored(page);
        let dialog = await open(page);
        const remove = dialog.locator(`[data-delete-field="${original.id}"]`);
        await remove.click();
        const confirmation = page.getByTestId('field-delete-confirmation');
        const cancel = confirmation.getByRole('button', { name: locale === 'zh' ? '取消' : 'Cancel', exact: true });
        await expect(cancel).toBeFocused();
        expect(await stored(page)).toEqual([original]);
        await cancel.click();
        await expect(remove).toBeFocused();
        await remove.click();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        expect(await stored(page)).toEqual([original]);
        dialog = await open(page);
        await dialog.locator(`[data-delete-field="${original.id}"]`).click();
        await insideViewport(page, confirmation);
        const screenshot = testInfo.outputPath('field-delete-confirmation.png');
        await page.screenshot({ path: screenshot });
        await testInfo.attach('Delete confirmation', { path: screenshot, contentType: 'image/png' });
        await confirmation.getByRole('button', { name: locale === 'zh' ? '删除思绪场' : 'Delete Field', exact: true }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect.poll(async () => (await stored(page)).map(p => p.id)).not.toContain(original.id);
        const [empty] = await stored(page);
        expect(empty.id).not.toBe(original.id);
        expect(empty.thoughts).toEqual({});
        expect(await page.evaluate(() => localStorage.getItem('diffusion-active-project'))).toBe(empty.id);
        await page.goto(`/?locale=${locale}`);
        await expect(page.getByTestId('field')).toBeVisible();
        expect((await stored(page)).map(p => p.id)).toEqual([empty.id]);
    });
}

test('deleting an inactive Field preserves the current duplicate and falls back from a stale startup ID', async ({ page }) => {
    await boot(page);
    const [original] = await stored(page);
    let dialog = await open(page);
    await dialog.getByRole('button', { name: 'Duplicate current Field', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const copyId = (await page.evaluate(() => localStorage.getItem('diffusion-active-project')))!;
    const copy = (await stored(page)).find(p => p.id === copyId)!;
    dialog = await open(page);
    await dialog.locator(`[data-delete-field="${original.id}"]`).click();
    await page.getByTestId('field-delete-confirmation').getByRole('button', { name: 'Delete Field', exact: true }).click();
    await expect(dialog.locator('.field-list li')).toHaveCount(1);
    await expect(dialog.locator('[aria-current="true"]')).toContainText(copy.title);
    expect((await stored(page))[0]).toEqual(copy);
    await page.evaluate(oldId => localStorage.setItem('diffusion-active-project', oldId), original.id);
    await page.goto('/?locale=en');
    await expect(page.getByTestId('field-title')).toHaveText(copy.title);
    expect((await stored(page))[0]).toEqual(copy);
});

for (const failure of ['replacement-save', 'delete']) {
    test(`a ${failure} failure does not delete the original Field`, async ({ page }) => {
        await boot(page);
        const [original] = await stored(page);
        await page.evaluate(failure => {
            if (failure === 'replacement-save') {
                const put = IDBObjectStore.prototype.put;
                IDBObjectStore.prototype.put = function (value, key) {
                    if (this.name === 'projects' && value.id !== 'demo') throw new Error('Injected replacement save failure');
                    return key === undefined ? put.call(this, value) : put.call(this, value, key);
                };
            } else {
                const remove = IDBObjectStore.prototype.delete;
                IDBObjectStore.prototype.delete = function (key) {
                    if (this.name === 'projects' && key === 'demo') throw new Error('Injected deletion failure');
                    return remove.call(this, key);
                };
            }
        }, failure);
        const dialog = await open(page);
        await dialog.locator(`[data-delete-field="${original.id}"]`).click();
        await page.getByTestId('field-delete-confirmation').getByRole('button', { name: 'Delete Field', exact: true }).click();
        await expect(page.locator('.notice[data-tone="error"]')).toContainText('could not be deleted');
        expect((await stored(page)).find(p => p.id === original.id)).toEqual(original);
        if (failure === 'replacement-save') await expect(page.getByTestId('field-title')).toHaveText(original.title);
    });
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
