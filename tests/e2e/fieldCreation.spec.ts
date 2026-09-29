import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought, type ProjectState } from '../../src/core/model.ts';

async function readProject(page: Page): Promise<ProjectState> {
    return page.evaluate(() => new Promise<ProjectState>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const request = db.transaction('projects').objectStore('projects').get('main');
            request.onerror = () => { db.close(); reject(request.error); };
            request.onsuccess = () => { db.close(); resolve(request.result); };
        };
    }));
}

async function view(page: Page) {
    return page.getByTestId('field').evaluate(element => ({
        scroll: { x: element.scrollLeft, y: element.scrollTop },
        transform: (element.querySelector('.world') as HTMLElement).style.transform,
        cards: Array.from(element.querySelectorAll<HTMLElement>('[data-thought-id]')).map(card => {
            const box = card.getBoundingClientRect();
            return { id: card.dataset.thoughtId, x: box.x, y: box.y, width: box.width, height: box.height };
        }),
    }));
}

for (const zoom of [0.75, 1, 1.5]) {
    test(`blank double-click at the viewport edge preserves existing Thoughts at zoom ${zoom}`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => localStorage.setItem('diffusion-first-field-tutorial-v1', JSON.stringify({ status: 'skipped' })));
        await page.goto('/?locale=zh');
        await expect(page.getByTestId('field')).toBeVisible();
        await expect.poll(async () => (await readProject(page))?.id).toBe('main');
        const fixture = createProject('main', '创建回归');
        fixture.camera = { x: 80, y: 40, zoom };
        const originals = [makeThought('第一张已有卡片', { x: 100, y: 100 }), makeThought('第二张已有卡片', { x: 400, y: 120 })];
        fixture.thoughts = Object.fromEntries(originals.map(thought => [thought.id, thought]));
        await page.evaluate(project => new Promise<void>((resolve, reject) => {
            const opening = indexedDB.open('diffusion-explorer-v1');
            opening.onerror = () => reject(opening.error);
            opening.onsuccess = () => {
                const db = opening.result;
                const transaction = db.transaction('projects', 'readwrite');
                transaction.objectStore('projects').put(project);
                transaction.oncomplete = () => { db.close(); resolve(); };
                transaction.onerror = () => { db.close(); reject(transaction.error); };
            };
        }), fixture);
        await page.reload();
        for (const thought of originals) await expect(page.locator(`[data-thought-id="${thought.id}"]`)).toBeVisible();
        const before = { project: await readProject(page), view: await view(page) };
        const size = page.viewportSize()!;
        await page.mouse.dblclick(size.width - 8, size.height - 4);
        const editor = page.locator('.thought.editing textarea');
        await expect(editor).toBeFocused();
        await expect.poll(async () => Object.keys((await readProject(page)).thoughts).length).toBe(3);
        const after = { project: await readProject(page), view: await view(page) };
        await testInfo.attach('creation-state', { body: JSON.stringify({ before, after }, null, 2), contentType: 'application/json' });
        await page.screenshot({ path: testInfo.outputPath('after-double-click.png') });
        expect(after.project.camera).toEqual(before.project.camera);
        expect(after.view.transform).toBe(before.view.transform);
        expect(after.view.scroll).toEqual({ x: 0, y: 0 });
        for (const thought of originals) {
            expect(after.project.thoughts[thought.id]).toEqual(before.project.thoughts[thought.id]);
            expect(after.view.cards.find(card => card.id === thought.id)).toEqual(before.view.cards.find(card => card.id === thought.id));
        }
        await editor.press('Escape');
        await expect.poll(async () => Object.keys((await readProject(page)).thoughts).length).toBe(2);
        await page.mouse.dblclick(950, 600);
        await editor.fill('新增卡片');
        await editor.press('Enter');
        await expect.poll(async () => Object.values((await readProject(page)).thoughts).some(thought => thought.text === '新增卡片')).toBe(true);
        await page.getByTestId('field').focus();
        await page.keyboard.press('Control+z'); // undo the text edit
        await page.keyboard.press('Control+z'); // undo the creation
        await expect.poll(async () => Object.keys((await readProject(page)).thoughts).length).toBe(2);
        await page.reload();
        for (const thought of originals) {
            await expect(page.locator(`[data-thought-id="${thought.id}"]`)).toContainText(thought.text);
            const restored = (await readProject(page)).thoughts[thought.id];
            expect({ text: restored.text, x: restored.x, y: restored.y }).toEqual({ text: thought.text, x: thought.x, y: thought.y });
        }
        expect(errors).toEqual([]);
    });
}
