import { test, expect, type Page } from '@playwright/test';
import type { ProjectState } from '../../src/core/model.ts';

async function currentProject(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('projects', 'readonly');
            const read = tx.objectStore('projects').get(localStorage.getItem('diffusion-active-project') || 'main');
            read.onsuccess = () => resolve(read.result);
            read.onerror = () => reject(read.error);
            tx.oncomplete = () => db.close();
        };
    }));
}

async function command(page: Page, label: string) {
    await page.keyboard.press('Control+k');
    await page.getByRole('option', { name: label, exact: true }).click();
}

for (const native of [false, true]) {
    test(`${native ? 'native credential handoff' : 'browser'} keeps text extraction alive on entry and after changing Fields`, async ({ page }) => {
        const text = 'NATIVE-SOURCE-LIFETIME：中文和标点必须保留。\n最后一行：SOURCE-END。';
        await page.addInitScript(({ native, text }) => {
            localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'en', provider: 'off' }));
            localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'complete' }));
            if (!native) return;
            const fixture = { opens: 0, presenceCalls: 0 };
            Object.assign(window, { sourceImportFixture: fixture, __TAURI_INTERNALS__: {
                invoke: async (name: string) => {
                    if (name === 'credential_has') { fixture.presenceCalls++; return false; }
                    if (name === 'discovery_available') return false;
                    if (name === 'plugin:dialog|open') return [`C:/synthetic/source-${++fixture.opens}.md`];
                    if (name === 'plugin:fs|stat') return { size: new TextEncoder().encode(text).length };
                    if (name === 'plugin:fs|read_file') return new TextEncoder().encode(text).buffer;
                    throw new Error(`Unexpected native fixture call: ${name}`);
                },
            } });
        }, { native, text });
        await page.goto('/?locale=en');
        await expect(page.getByTestId('field')).toBeVisible();
        if (native) await expect.poll(() => page.evaluate(() => (window as any).sourceImportFixture.presenceCalls)).toBeGreaterThan(0);

        for (const round of [1, 2]) {
            if (round === 2) {
                await command(page, 'New Field');
                await expect.poll(async () => (await currentProject(page))?.id).not.toBe('main');
            }
            await command(page, 'Import / Restore');
            const chooser = native ? null : page.waitForEvent('filechooser');
            await page.getByRole('button', { name: 'Choose files', exact: true }).click();
            if (chooser) await (await chooser).setFiles({ name: `source-${round}.md`, mimeType: 'text/markdown', buffer: Buffer.from(text) });
            await expect.poll(async () => {
                const project = await currentProject(page);
                return Object.values(project?.sources || {}).map(source => ({ title: source.title, status: source.status, excerpt: source.excerpt }));
            }, 'the real extraction worker retains the imported wording').toEqual([{ title: `source-${round}.md`, status: 'ready', excerpt: text }]);
            const sourceThoughts = Object.values((await currentProject(page)).thoughts);
            expect(sourceThoughts).toHaveLength(1);
            expect(sourceThoughts[0].kind).toBe('source');
        }
    });
}
