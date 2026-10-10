import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';

async function saved(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const read = db.transaction('projects').objectStore('projects').get('main');
            read.onerror = () => { db.close(); reject(read.error); };
            read.onsuccess = () => { db.close(); resolve(read.result as ProjectState); };
        };
    }));
}

test('explicit Crystal Handoff carries direct-parent context into preview and downloaded Markdown', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
        localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en' }));
        localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
    });
    await page.goto('/?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const project = createProject('main', 'Synthetic Handoff context');
    project.thoughts.parent = makeThought('The pilot audience remains undecided.', { x: 200, y: 240 }, 1, 'parent');
    project.thoughts.parent.sourceId = 'reference';
    project.thoughts.child = {
        ...makeThought('Start with a small pilot.', { x: 650, y: 240 }, 1, 'child'),
        derivedFrom: ['parent'], generationAction: 'continue',
    };
    project.sources.reference = {
        id: 'reference', title: 'Synthetic reference', mime: 'text/plain', status: 'limited',
        excerpt: 'Only a bounded synthetic excerpt.', inspected: 'One paragraph only; remainder unread.',
        originalPath: '/private/synthetic.txt', originalKey: 'synthetic-local-bytes', provenance: {},
    };
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
    await page.locator('[data-thought-id="child"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="crystallize"]').click();
    await page.getByRole('button', { name: 'Confirm this Crystal', exact: true }).click();
    await expect.poll(async () => (await saved(page)).thoughts.child.kind).toBe('crystal');
    const before = await saved(page);
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="handoff"]').click();
    const preview = page.locator('.handoff-preview');
    await expect(preview).toContainText('### Still open / parent');
    await expect(preview).toContainText('The pilot audience remains undecided.');
    await expect(preview).toContainText('One paragraph only; remainder unread.');
    await expect(preview).toContainText('None. Unconfirmed phenomena were not promoted.');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Markdown', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('diffusion-handoff.md');
    const path = await download.path();
    if (!path) throw new Error('Handoff download is unavailable');
    const markdown = await readFile(path, 'utf8');
    expect(markdown).toContain('### Still open / parent');
    expect(markdown).toContain('The pilot audience remains undecided.');
    expect(markdown).toContain('One paragraph only; remainder unread.');
    expect(markdown).toContain('None. Unconfirmed phenomena were not promoted.');
    expect(markdown).not.toContain('/private/synthetic.txt');
    expect(markdown).not.toContain('synthetic-local-bytes');
    expect(await saved(page)).toEqual(before);
    await page.screenshot({ path: test.info().outputPath('handoff-parent-context.png') });
    expect(errors).toEqual([]);
});
