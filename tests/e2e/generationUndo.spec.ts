import { test, expect, type Page } from '@playwright/test';
import type { ProjectState } from '../../src/core/model.ts';

const texts = ['A brief observation could reveal whether the assumption holds.', 'The effort of collecting evidence may change which experiment is practical.', 'Define a stopping condition before exploring further consequences.'];
async function boot(page: Page, locale = 'en') {
    await page.addInitScript(locale => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale, provider: 'gateway' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    }, locale);
    let requests = 0;
    await page.route('**/api/respond', route => {
        requests++;
        return route.fulfill({ json: { providerLabel: 'Undo fixture / not live', mock: true,
            intents: texts.map(text => ({ type: 'surface_possibility', text })) } });
    });
    await page.goto(`/demo?locale=${locale}`);
    await expect(page.getByTestId('field')).toBeVisible();
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('scope-continue').click();
    const preview = page.getByRole('dialog', { name: locale === 'zh' ? '继续想' : 'Continue thinking', exact: true });
    await preview.getByRole('button', { name: '3', exact: true }).click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.locator('.thought.ghost')).toHaveCount(3);
    return () => requests;
}
async function stored(page: Page) {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const read = db.transaction('projects').objectStore('projects').get('demo');
            read.onsuccess = () => { db.close(); resolve(read.result); };
            read.onerror = () => { db.close(); reject(read.error); };
        };
    }));
}

for (const locale of ['en', 'zh']) {
    test(`completed generation has one localized Undo and request-free Redo: ${locale}`, async ({ page }, testInfo) => {
        if (locale === 'zh') await page.emulateMedia({ reducedMotion: 'reduce' });
        const requests = await boot(page, locale);
        const ids = await page.locator('.thought.ghost').evaluateAll(elements => elements.map(e => e.getAttribute('data-thought-id')));
        const before = await stored(page);
        await page.keyboard.press('Control+k');
        const undo = page.getByTestId('command-palette').locator('[data-command="undo"]');
        await expect(undo).toContainText(locale === 'zh' ? '撤销本轮 AI 生成' : 'Undo AI generation');
        await undo.scrollIntoViewIfNeeded();
        await expect(undo).toBeVisible();
        const screenshot = testInfo.outputPath('generation-undo-command.png');
        await page.screenshot({ path: screenshot });
        await testInfo.attach('Generation Undo label', { path: screenshot, contentType: 'image/png' });
        await page.keyboard.press('Escape');
        await page.getByTestId('field').focus();
        await page.keyboard.press('Control+z');
        await expect(page.locator('.thought.ghost')).toHaveCount(0);
        await expect(page.locator('.notice')).toContainText(locale === 'zh' ? '已撤销本轮 AI 生成' : 'AI generation undone');
        expect(await stored(page)).toEqual(before);
        await page.keyboard.press('Control+Shift+z');
        await expect(page.locator('.thought.ghost')).toHaveCount(3);
        expect(await page.locator('.thought.ghost').evaluateAll(elements => elements.map(e => e.getAttribute('data-thought-id')))).toEqual(ids);
        expect(requests()).toBe(1);
        expect(await stored(page)).toEqual(before);
        await page.reload();
        await expect(page.getByTestId('field')).toBeVisible();
        await expect(page.locator('.thought.ghost')).toHaveCount(0);
        expect((await stored(page)).thoughts).toEqual(before.thoughts);
    });
}

test('Undo Keep returns its Ghost first; the next Undo removes the complete generation', async ({ page }) => {
    const requests = await boot(page);
    const first = page.locator('.thought.ghost').first();
    const id = (await first.getAttribute('data-thought-id'))!;
    await first.click();
    await page.getByTestId('scope-hub').getByRole('button', { name: 'Keep this', exact: true }).click();
    await expect(page.locator(`[data-thought-id="${id}"]`)).not.toHaveClass(/ghost/);
    await page.getByTestId('field').focus();
    await page.keyboard.press('Control+z');
    await expect(page.locator('.thought.ghost')).toHaveCount(3);
    await page.keyboard.press('Control+z');
    await expect(page.locator('.thought.ghost')).toHaveCount(0);
    await page.keyboard.press('Control+y');
    await expect(page.locator('.thought.ghost')).toHaveCount(3);
    await page.keyboard.press('Control+y');
    await expect(page.locator(`[data-thought-id="${id}"]`)).not.toHaveClass(/ghost/);
    await expect.poll(async () => !!(await stored(page)).thoughts[id]).toBe(true);
    await page.reload();
    await expect(page.locator(`[data-thought-id="${id}"]`)).toBeVisible();
    await expect(page.locator('.thought.ghost')).toHaveCount(0);
    expect(requests()).toBe(1);
});

test('text editing and IME composition retain keyboard Undo ownership', async ({ page }) => {
    await boot(page);
    await page.getByTestId('field').focus();
    for (const state of [{ isComposing: true }, { keyCode: 229 }]) {
        await page.getByTestId('field').dispatchEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, ...state });
        await expect(page.locator('.thought.ghost')).toHaveCount(3);
    }
    await page.locator('[data-thought-id="attention"]').dblclick();
    const editor = page.locator('.thought.editing textarea');
    await expect(editor).toBeFocused();
    await editor.press('Control+z');
    await expect(page.locator('.thought.ghost')).toHaveCount(3);
});
