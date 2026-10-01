import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';

async function seed(page: Page) {
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.goto('/?locale=zh');
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', '层级验收');
    for (const [index, id] of ['a', 'b', 'c', 'd'].entries()) {
        project.thoughts[id] = makeThought(`${id.toUpperCase()} 层级想法`, { x: 190 + (index % 2) * 460, y: 180 + Math.floor(index / 2) * 270 }, 1, id);
        if (index) Object.assign(project.thoughts[id], { derivedFrom: [String.fromCharCode(96 + index)], generationAction: 'continue' });
    }
    await page.evaluate(p => new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result; const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(p); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), project);
    await page.reload();
    await expect(page.locator('[data-thought-id="c"]')).toBeVisible();
}
async function openLineage(page: Page) {
    await page.locator('[data-thought-id="c"]').click();
    await page.getByTestId('thought-more').click();
    await page.locator('[data-command="thought-lineage"]').click();
    await expect(page.getByTestId('organizing-parent')).toBeVisible();
}
test('parent change is explicit, undoable and durable while sources stay unchanged', async ({ page }, info) => {
    await seed(page);
    const before = await page.locator('[data-thought-id="c"]').getAttribute('style');
    await openLineage(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('B 层级想法');
    await page.getByTestId('organizing-parent').click();
    await page.getByRole('option', { name: 'A 层级想法', exact: true }).click();
    await page.getByTestId('apply-parent').click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-thought-id="c"]')).toHaveAttribute('data-origin-scope', 'b');
    expect(await page.locator('[data-thought-id="c"]').getAttribute('style')).toBe(before);
    await openLineage(page);
    await expect(page.getByTestId('organizing-parent')).toHaveAttribute('data-value', 'parent:a');
    await page.screenshot({ path: info.outputPath('sources-and-new-parent.png') });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+z');
    await openLineage(page);
    await expect(page.getByTestId('organizing-parent')).toHaveAttribute('data-value', 'default');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Shift+z');
    await expect.poll(() => page.evaluate(() => new Promise<string | null>(resolve => {
        const req = indexedDB.open('diffusion-explorer-v1');
        req.onsuccess = () => { const db = req.result; const read = db.transaction('projects').objectStore('projects').get('main'); read.onsuccess = () => { resolve(read.result?.thoughts.c.organizingParentId ?? null); db.close(); }; };
    }))).toBe('a');
    await page.reload();
    await openLineage(page);
    await expect(page.getByTestId('organizing-parent')).toHaveAttribute('data-value', 'parent:a');
    await expect(page.getByRole('dialog')).toContainText('B 层级想法');
});
