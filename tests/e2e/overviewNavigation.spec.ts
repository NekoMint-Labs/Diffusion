import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';

async function boot(page: Page, theme: string, zoom: number, dense = false) {
    await page.addInitScript(theme => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', theme, appearance: { profile: theme === 'dark' ? 'graphite-night' : 'editorial-warm' } }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, theme);
    await page.goto('/?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', 'Overview navigation fixture');
    project.thoughts.a = makeThought('Parent source', { x: 200, y: 180 }, 1, 'a');
    project.thoughts.b = { ...makeThought('Target anchored child', { x: 1300, y: 600 }, 1, 'b'), organizingParentId: 'a' };
    project.thoughts.c = makeThought('Independent semantic endpoint', { x: 750, y: 340 }, 1, 'c');
    if (dense) for (let i = 0; i < 80; i++) project.thoughts['dense-' + i] = makeThought('Dense thought ' + i, { x: 400 + i * 6, y: 400 + i * 4 }, 1, 'dense-' + i);
    project.relations.r = { id: 'r', a: 'a', b: 'c', kind: 'support', label: 'Established semantic support', status: 'confirmed', createdAt: 1 };
    project.camera = { x: 10, y: 40, zoom };
    await page.evaluate(project => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result, tx = db.transaction('projects', 'readwrite');
            tx.objectStore('projects').put(project);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
        };
    }), project);
    await page.reload();
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', zoom === 1 ? 'local' : 'atlas');
    return project;
}

async function saved(page: Page) {
    return page.evaluate(() => new Promise<any>(resolve => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => {
            const db = request.result, read = db.transaction('projects').objectStore('projects').get('main');
            read.onsuccess = () => { db.close(); resolve(read.result); };
        };
    }));
}

for (const theme of ['light', 'dark']) {
    for (const ime of [
        { name: 'isComposing', isComposing: true, keyCode: 27 },
        { name: 'legacy keyCode 229', isComposing: false, keyCode: 229 },
    ]) test(`overview search keeps focus during IME composition Escape: ${theme}, ${ime.name}`, async ({ page }) => {
        const initial = await boot(page, theme, .2);
        const world = page.locator('.world'), before = await world.getAttribute('style');
        const toggle = page.getByTestId('root-review-toggle');
        await toggle.click();
        const input = page.getByRole('textbox', { name: 'Find anchored thoughts' });
        await input.fill('目标');
        await expect(input).toBeFocused();
        await input.dispatchEvent('compositionstart', { data: '中' });
        const prevented = await input.evaluate((element, ime) => {
            const event = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true, isComposing: ime.isComposing, keyCode: ime.keyCode });
            element.dispatchEvent(event);
            return event.defaultPrevented;
        }, ime);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(input).toBeFocused();
        await expect(input).toHaveValue('目标');
        expect(prevented).toBe(false);
        await expect(world).toHaveAttribute('style', before!);
        await input.dispatchEvent('compositionend', { data: '' });
        await input.press('Escape');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toBeFocused();
        await expect(input).toHaveCount(0);
        await toggle.press('Enter');
        await expect(input).toBeFocused();
        await expect(input).toHaveValue('');
        await expect(world).toHaveAttribute('style', before!);
        const persisted = await saved(page);
        expect(persisted.camera).toEqual(initial.camera);
        expect(persisted.thoughts).toEqual(initial.thoughts);
        expect(persisted.relations).toEqual(initial.relations);
    });
    test(`overview navigation remains usable after Find closes: ${theme}`, async ({ page }) => {
        const initial = await boot(page, theme, .2);
        await page.keyboard.press('Control+f');
        await page.locator('.find-bar input').fill('Parent source');
        await expect(page.locator('[data-thought-id="a"]')).toHaveAttribute('data-find', 'current');
        await page.keyboard.press('Escape');
        await page.getByTestId('root-review-toggle').click();
        await page.locator('.root-review .suggestion-review-list button').filter({ hasText: 'Target anchored child' }).click();
        const target = page.locator('[data-thought-id="b"]');
        await expect(target).toBeVisible();
        await expect(target).toHaveAttribute('data-selected', 'true');
        await expect.poll(async () => (await saved(page)).camera.zoom).toBe(.2);
        expect((await saved(page)).thoughts).toEqual(initial.thoughts);
        // Explicit Find navigation remains usable after the overview action.
        await page.keyboard.press('Control+f');
        await page.locator('.find-bar input').fill('Independent semantic endpoint');
        await page.locator('.find-bar input').press('Enter');
        await expect(page.locator('[data-thought-id="c"]')).toHaveAttribute('data-find', 'current');
    });
    test(`opening the overview list retains an anchor at the viewport edge: ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: 900, height: 640 });
        const initial = await boot(page, theme, .2);
        const fieldBox = (await page.getByTestId('field').boundingBox())!;
        initial.thoughts.b.y = (fieldBox.height + 180 - initial.camera.y) / initial.camera.zoom;
        initial.thoughts.b.organizingParentId = null;
        for (let i = 0; i < 5; i++) initial.thoughts['edge-' + i] = makeThought('Edge overview thought ' + i, { x: 1300 + i * 10, y: initial.thoughts.b.y }, 1, 'edge-' + i);
        await page.evaluate(project => new Promise<void>(resolve => {
            const request = indexedDB.open('diffusion-explorer-v1');
            request.onsuccess = () => { const db = request.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project); tx.oncomplete = () => { db.close(); resolve(); }; };
        }), initial);
        await page.reload();
        await expect(page.getByTestId('root-review-toggle')).toBeVisible();
        await page.getByTestId('root-review-toggle').click();
        await expect(page.getByRole('textbox', { name: 'Find anchored thoughts' })).toBeVisible();
        await page.locator('.root-review .suggestion-review-list button').filter({ hasText: 'Target anchored child' }).click();
        await expect(page.locator('[data-thought-id="b"]')).toBeVisible();
        expect((await saved(page)).thoughts).toEqual(initial.thoughts);
    });
    for (const dense of [false, true]) test(`overview list gives searchable navigation feedback: ${theme}, dense=${dense}`, async ({ page }, info) => {
        const initial = await boot(page, theme, .2, dense);
        const world = page.locator('.world'), before = await world.getAttribute('style');
        const toggle = page.getByTestId('root-review-toggle');
        await expect(toggle).toContainText('Locate');
        await toggle.click();
        const input = page.getByRole('textbox', { name: 'Find anchored thoughts' });
        await expect(input).toBeFocused();
        await expect(page.locator('.root-review')).toContainText('Choose a thought to reveal its location');
        await expect(world).toHaveAttribute('style', before!);
        await input.fill('No such overview thought');
        await expect(page.locator('.root-review [role="status"]')).toContainText('No overview thoughts match');
        await input.press('Escape');
        await expect(toggle).toBeFocused();
        await toggle.press('Enter');
        await expect(input).toHaveValue('');
        await input.fill('Target anchored child');
        await page.screenshot({ path: info.outputPath('overview-list.png') });
        await page.locator('.root-review .suggestion-review-list button').filter({ hasText: 'Target anchored child' }).click();
        await expect(page.locator('[data-thought-id="b"]')).toBeVisible();
        await expect(page.locator('[data-thought-id="b"]')).toHaveAttribute('data-selected', 'true');
        await expect(page.getByTestId('field')).toBeFocused();
        await expect(world).not.toHaveAttribute('style', before!);
        await expect.poll(async () => (await saved(page)).camera.zoom).toBe(.2);
        expect((await saved(page)).thoughts).toEqual(initial.thoughts);
        await page.screenshot({ path: info.outputPath('overview-revealed.png') });
    });
    test(`line distinction and zoom feedback preserve relations: ${theme}`, async ({ page }, info) => {
        const initial = await boot(page, theme, 1);
        expect((await page.getByTestId('field').boundingBox())!.height).toBe(960);
        const relation = page.locator('[data-relation-id="r"] path');
        const hierarchy = page.locator('[data-causal-id="causal:a:b"] .causal-trace-visual');
        await expect(relation).toBeVisible();
        await expect(hierarchy).toBeVisible();
        await expect(relation).toHaveCSS('opacity', '0.48');
        await expect(relation).toHaveCSS('stroke-width', '1.4px');
        await expect(relation).toHaveCSS('marker-end', 'none');
        await expect(hierarchy).toHaveCSS('marker-end', /hierarchy-direction-1/);
        await expect(page.getByTestId('field-line-key')).toContainText('Parent → child');
        await expect(page.getByTestId('field-line-key')).toContainText('Semantic relation · no arrow');
        await page.screenshot({ path: info.outputPath('local-lines-rest.png') });
        await page.locator('[data-thought-id="a"]').click();
        await expect(relation).toHaveCSS('opacity', '0.85');
        await page.screenshot({ path: info.outputPath('local-lines-selected.png') });
        await page.mouse.move(100, 100);
        await page.keyboard.down('Control');
        const zoom = () => page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
        for (let i = 0; i < 2; i++) { const before = await zoom(); await page.mouse.wheel(0, 60); await expect.poll(zoom).not.toBe(before); }
        await page.keyboard.up('Control');
        await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'neighborhood');
        await expect(page.locator('[data-relation-id="r"]')).toHaveCount(0);
        await expect(page.getByTestId('relation-visibility-hint')).toHaveText('Zoom in to inspect semantic relations.');
        await expect(hierarchy).toBeVisible();
        expect((await saved(page)).relations).toEqual(initial.relations);
        await page.screenshot({ path: info.outputPath('neighborhood-line-hint.png') });
    });
}
