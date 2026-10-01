import { test, expect, type Page } from '@playwright/test';
import { createProject, makeThought } from '../../src/core/model.ts';

async function seed(page: Page) {
    await page.addInitScript(() => {
        if (!localStorage.getItem('diffusion-settings')) localStorage.setItem('diffusion-settings', JSON.stringify({ locale: 'zh', provider: 'demo' }));
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
    const menu = page.getByTestId('thought-menu');
    await expect(menu).toBeVisible();
    await page.locator('[data-command="thought-lineage"]').click({ trial: true });
    const original = (await menu.boundingBox())!;
    await page.locator('[data-command="thought-lineage"]').click();
    await expect(page.getByTestId('organizing-parent')).toBeVisible();
    const retiringMenu = page.locator('#thought-command-menu');
    const duringExit = await retiringMenu.evaluateAll(elements => {
        const rect = elements[0]?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height > 0 ? { x: rect.x, y: rect.y } : null;
    });
    // Exit may finish between reading the DOM and measuring it. A retired menu has no box;
    // any still-painted exit frame must keep its original anchor.
    if (duringExit) {
        expect(Math.abs(duringExit.x - original.x)).toBeLessThan(4);
        expect(Math.abs(duringExit.y - original.y)).toBeLessThan(12);
    }
    await expect(retiringMenu).toHaveCount(0);
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
    await expect(page.locator('[data-causal-id="causal:b:c"]')).toHaveAttribute('data-relationship', 'source');
    await expect(page.locator('[data-causal-id="organization:a:c"]')).toHaveAttribute('data-relationship', 'organization');
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

test('connection style is a durable device preference and never changes the project', async ({ page }, info) => {
    await seed(page);
    const trace = page.locator('[data-causal-id="causal:a:b"]');
    await expect(trace).toHaveAttribute('data-line-style', 'curve');
    await expect(trace).toHaveAttribute('data-causal-state', 'sleep');
    expect(await trace.locator('.causal-trace-visual').evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(.3);
    const readThoughts = () => page.evaluate(() => new Promise<string>(resolve => {
        const request = indexedDB.open('diffusion-explorer-v1');
        request.onsuccess = () => { const db = request.result; const read = db.transaction('projects').objectStore('projects').get('main'); read.onsuccess = () => { resolve(JSON.stringify(read.result.thoughts)); db.close(); }; };
    }));
    const before = await readThoughts();
    await page.keyboard.press('Control+,');
    await page.locator('.settings-nav button[data-section="appearance"]').click();
    await page.getByTestId('connection-style').click();
    await page.getByRole('option', { name: '折线', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(trace).toHaveAttribute('data-line-style', 'elbow');
    expect(await trace.locator('.causal-trace-visual').getAttribute('d')).not.toContain(' C');
    expect(await readThoughts()).toBe(before);
    await page.screenshot({ path: info.outputPath('default-source-elbows.png') });
    await page.reload();
    await expect(trace).toHaveAttribute('data-line-style', 'elbow');
    expect(await readThoughts()).toBe(before);
});

test('dragging a third thought across a source trace reroutes the trace before commit', async ({ page }, info) => {
    await seed(page);
    const route = page.locator('[data-causal-id="causal:a:b"] .causal-trace-visual');
    // The horizontal fixture first draws estimated boxes, then uses actual text measurements.
    // Capture the measured route so undo is compared with the same geometry on every platform.
    await expect.poll(() => route.evaluate(path => {
        const line = path as SVGGeometryElement;
        const start = line.getPointAtLength(0).matrixTransform(line.getScreenCTM()!);
        const source = document.querySelector('[data-thought-id="a"]')!.getBoundingClientRect();
        return Math.hypot(start.x - source.right, start.y - (source.top + source.height / 2));
    })).toBeLessThan(1);
    const original = await route.getAttribute('d');
    const moving = page.locator('[data-thought-id="d"]');
    const box = (await moving.boundingBox())!;
    await page.mouse.move(box.x + 30, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(470, 202, { steps: 10 });
    await expect(route).not.toHaveAttribute('d', original!);
    const crossesText = await route.evaluate(path => {
        const line = path as SVGGeometryElement, matrix = line.getScreenCTM()!;
        const text = document.querySelector('[data-thought-id="d"] .thought-preview')!.getBoundingClientRect();
        const length = line.getTotalLength();
        return Array.from({ length: 101 }, (_, i) => line.getPointAtLength(length * i / 100).matrixTransform(matrix)).some(p => p.x > text.left && p.x < text.right && p.y > text.top && p.y < text.bottom);
    });
    expect(crossesText).toBe(false);
    await page.screenshot({ path: info.outputPath('drag-obstacle-route.png') });
    await page.mouse.up();
    await page.keyboard.press('Control+z');
    await expect(route).toHaveAttribute('d', original!);
});

test('zoom collapses deeper branches, Find reveals them and return restores disclosure', async ({ page }, info) => {
    await seed(page);
    await page.getByTestId('field').click({ position: { x: 80, y: 500 } });
    await page.mouse.move(400, 300);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 160); await page.waitForTimeout(100); }
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
    await expect(page.locator('[data-thought-id="c"]')).toHaveCount(0);
    await expect(page.locator('[data-thought-id="a"]')).toBeVisible();
    await expect(page.locator('[data-thought-id="a"] [data-testid="branch-expand"]')).toBeVisible();
    await page.keyboard.press('Control+f');
    await page.locator('.find-bar input').fill('C 层级想法');
    await expect(page.locator('[data-thought-id="c"][data-find="current"]')).toBeVisible();
    await page.screenshot({ path: info.outputPath('deep-find-atlas.png') });
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-thought-id="c"]')).toHaveCount(0);
    await page.mouse.move(400, 300);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -160); await page.waitForTimeout(100); }
    await expect(page.locator('[data-thought-id="c"]')).toBeVisible();
    await expect(page.locator('[data-causal-id="causal:b:c"]')).toBeVisible();
});
