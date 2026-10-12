import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';

test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });

async function boot(page: Page, theme: 'light' | 'dark') {
    await page.addInitScript(theme => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'gateway', theme }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, theme);
    await page.route('**/api/respond', route => route.fulfill({ json: {
        providerLabel: 'Keyboard fixture / not live', mock: true,
        intents: [{ type: 'surface_possibility', text: '先记录一项可验证的观察，再决定下一步。' }],
    } }));
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', '建议阅读键盘回归');
    project.thoughts.source = makeThought('怎样安排课程学习？', { x: 350, y: 220 }, 1, 'source');
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
    await page.locator('[data-thought-id="source"]').click();
    await page.getByTestId('scope-continue').click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.locator('article.ghost')).toHaveCount(1);
    await page.mouse.move(100, 300);
    await page.keyboard.down('Control');
    for (let i = 0; i < 15; i++) {
        const zoom = await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
        if (zoom <= .17) break;
        await page.mouse.wheel(0, 60);
        await page.waitForTimeout(100);
    }
    await page.keyboard.up('Control');
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
    await expect(page.locator('article.ghost')).toHaveCount(0);
    const zoom = await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
    await expect.poll(async () => (await saved(page)).camera.zoom).toBeCloseTo(zoom, 6);
    const toggle = page.getByTestId('suggestion-review-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

async function saved(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result, read = db.transaction('projects').objectStore('projects').get('main');
            read.onsuccess = () => { db.close(); resolve(read.result); };
            read.onerror = () => reject(read.error);
        };
    }));
}

for (const theme of ['light', 'dark'] as const) for (const ime of [
    { name: 'isComposing', isComposing: true, keyCode: 27 },
    { name: 'legacy keyCode 229', isComposing: false, keyCode: 229 },
]) test(`suggestion review preserves IME Escape and returns ordinary Escape focus: ${theme}, ${ime.name}`, async ({ page }) => {
    await boot(page, theme);
    const before = await saved(page), camera = await page.locator('.world').getAttribute('style');
    const toggle = page.getByTestId('suggestion-review-toggle'), keep = page.getByTestId('suggestion-keep');
    await keep.focus();
    const prevented = await keep.evaluate((element, ime) => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true, isComposing: ime.isComposing, keyCode: ime.keyCode });
        element.dispatchEvent(event);
        return event.defaultPrevented;
    }, ime);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(keep).toBeFocused();
    expect(prevented).toBe(false);
    await keep.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect(keep).toHaveCount(0);
    await toggle.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(keep).toHaveCount(1);
    await expect(page.getByTestId('suggestion-review')).toContainText('先记录一项可验证的观察');
    await expect(page.locator('.world')).toHaveAttribute('style', camera!);
    const after = await saved(page);
    expect(after.camera).toEqual(before.camera);
    expect(after.thoughts).toEqual(before.thoughts);
    expect(after.relations).toEqual(before.relations);
});
