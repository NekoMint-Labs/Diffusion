import fs from 'node:fs';
import { test, expect, type Locator, type Page } from '@playwright/test';
import type { ProjectState } from '../../src/core/model.ts';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

async function readProject(page: Page, id = 'demo'): Promise<ProjectState> {
    return page.evaluate(projectId => new Promise<ProjectState>((resolve, reject) => {
        const opening = indexedDB.open('diffusion-explorer-v1');
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
            const db = opening.result;
            const request = db.transaction('projects').objectStore('projects').get(projectId);
            request.onerror = () => { db.close(); reject(request.error); };
            request.onsuccess = () => { db.close(); resolve(request.result as ProjectState); };
        };
    }), id);
}
const openFieldMenu = async (page: Page, command: string) => {
    await page.getByTestId('field-title').click();
    const root = page.getByTestId('field-menu');
    const direct = root.locator(`[data-command="${command}"]`);
    if (await direct.count()) {
        await direct.click();
        return;
    }
    await root.locator('[data-command="more"]').click();
    await page.getByTestId('field-more-menu').locator(`[data-command="${command}"]`).click();
};
async function drag(page: Page, target: Locator, dx: number, dy: number) {
    const box = await target.boundingBox();
    if (!box)
        throw new Error('Thought has no bounding box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 });
    await page.mouse.up();
}

test('the Field title owns Field operations and rename stays one reversible action', async ({ page }) => {
    await page.getByTestId('field-title').click();
    const menu = page.getByTestId('field-menu');
    await expect(menu).toBeVisible();
    expect((await menu.getByRole('menuitem').allTextContents()).map(text => text.trim()))
        .toEqual(['Rename Field', 'New Field', 'Open Field...', 'More']);
    await menu.locator('[data-command="more"]').click();
    const more = page.getByTestId('field-more-menu');
    expect(await more.getByRole('menuitem').count()).toBeLessThanOrEqual(6);
    await expect(menu).toContainText('Saved on this device as you work.');
    await menu.locator('[data-command="rename-field"]').click();
    const input = page.getByTestId('field-rename');
    await expect(input).toBeFocused();
    await input.fill('A quieter name');
    await input.press('Enter');
    await expect(page.locator('.identity h1')).toHaveText('A quieter name');
    await expect.poll(async () => (await readProject(page)).title).toBe('A quieter name');
    await page.keyboard.press('Control+z');
    await expect(page.locator('.identity h1')).toHaveText('Quiet, not empty');
    await expect.poll(async () => (await readProject(page)).title).toBe('Quiet, not empty');
});

test('Ctrl+K orders the palette by the current scope and runs the shared command', async ({ page }) => {
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    const camera = (await readProject(page)).camera;
    await page.keyboard.press('Control+k');
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible();
    await expect(palette.locator('.command-palette-scope')).toHaveText('2 thoughts');
    await expect(palette.locator('.command-palette-heading').first()).toHaveText('Think');
    // A pair of Thoughts makes the relation action the highest-priority command; the generic
    // `explore` command is gone, replaced by `find-relation` for exactly two Thoughts.
    await expect(palette.locator('[role="option"]').first()).toHaveText('Find a relation');
    const query = palette.locator('#command-palette-input');
    await query.fill('结晶');
    await expect(palette.locator('[role="option"]')).toHaveCount(1);
    await query.fill('export');
    await expect(palette.locator('[role="option"]')).toHaveCount(2);
    await query.fill('zzzz');
    await expect(palette.getByText('No matching command.')).toBeVisible();
    await query.fill('crystallize');
    await query.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Let this become a Crystal' })).toBeVisible();
    expect((await readProject(page)).camera).toEqual(camera);
});

test('the palette is keyboard-first, IME-safe and returns focus to the Field', async ({ page }) => {
    await page.getByTestId('field').focus();
    await page.keyboard.press('Control+k');
    const palette = page.getByTestId('command-palette');
    const input = palette.locator('#command-palette-input');
    await expect(input).toBeFocused();
    // Nothing selected: creating a thought is the highest-priority command, Find follows.
    await expect(palette.locator('[role="option"]').first()).toHaveText('New thought');
    await input.press('ArrowDown');
    await expect(palette.locator('[data-active="true"]')).toHaveText(/Find in Field/);
    await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
    await expect(palette).toBeVisible();
    await input.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Find in Field' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('field')).toBeFocused();
});

test('right-click selects a Thought without editing and preserves an existing multi-selection', async ({ page }) => {
    const attention = page.locator('[data-thought-id="attention"]');
    const structure = page.locator('[data-thought-id="structure"]');
    const box = await attention.boundingBox();
    if (!box)
        throw new Error('Thought bounds are unavailable');
    await page.mouse.click(box.x + 10, box.y + 6, { button: 'right' });
    const menu = page.getByTestId('thought-menu');
    await expect(menu).toBeVisible();
    await expect(attention).toHaveAttribute('data-selected', 'true');
    await expect(page.getByRole('textbox', { name: 'Edit thought' })).toHaveCount(0);
    const menuBox = await menu.boundingBox();
    if (!menuBox)
        throw new Error('Menu bounds are unavailable');
    expect(menuBox.x).toBeGreaterThanOrEqual(0);
    expect(menuBox.y).toBeGreaterThanOrEqual(0);
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(1440);
    expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(960);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(page.getByTestId('field')).toBeFocused();

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await attention.click();
    await structure.click({ modifiers: ['Shift'] });
    await expect(page.locator('[data-selected="true"]')).toHaveCount(2);
    const structureBox = await structure.boundingBox();
    if (!structureBox)
        throw new Error('Structure bounds are unavailable');
    await page.mouse.click(structureBox.x + 10, structureBox.y + 6, { button: 'right' });
    await expect(menu).toBeVisible();
    await expect(page.locator('[data-selected="true"]')).toHaveCount(2);
    // More opens a secondary column while the primary choices stay in place.
    await menu.getByRole('menuitem', { name: 'More', exact: true }).click();
    await page.getByTestId('thought-more-menu').locator('[data-command="copy-text"]').click();
    await expect(page.locator('.notice')).toContainText('Copied to the clipboard.');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('Attention should change clarity');
    expect(clipboard).toContain('Perhaps selection itself defines a temporary scope.');
});

test('right-click on the empty Field offers only real actions and never changes selection', async ({ page }) => {
    await page.locator('[data-thought-id="attention"]').click();
    await page.mouse.click(1200, 800, { button: 'right' });
    const menu = page.getByTestId('blank-menu');
    await expect(menu).toBeVisible();
    expect(await menu.locator('[data-command]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-command')))).toEqual(['new-thought', 'find']);
    await expect(page.locator('[data-selected="true"]')).toHaveCount(1);
    const camera = (await readProject(page)).camera;
    await menu.locator('[data-command="new-thought"]').click();
    const input = page.getByRole('textbox', { name: 'Edit thought' });
    await input.fill('Placed where I pointed');
    await input.press('Enter');
    const placed = page.locator('[data-thought-id]').filter({ hasText: 'Placed where I pointed' });
    await expect(placed).toBeVisible();
    const placedBox = await placed.boundingBox();
    if (!placedBox)
        throw new Error('Placed Thought bounds are unavailable');
    expect(Math.abs(placedBox.x - 1200)).toBeLessThan(120);
    expect(Math.abs(placedBox.y - 800)).toBeLessThan(120);
    expect((await readProject(page)).camera).toEqual(camera);
});

test('Undo reverses one deliberate action at a time while selection and camera are not history', async ({ page }) => {
    const before = await readProject(page);
    const count = Object.keys(before.thoughts).length;
    await page.mouse.dblclick(1120, 650);
    const input = page.getByRole('textbox', { name: 'Edit thought' });
    await input.fill('A new line of thinking');
    await input.press('Enter');
    await expect.poll(async () => Object.keys((await readProject(page)).thoughts).length).toBe(count + 1);
    const placed = page.locator('[data-thought-id]').filter({ hasText: 'A new line of thinking' });
    const id = await placed.getAttribute('data-thought-id');
    if (!id)
        throw new Error('Placed Thought has no identity');
    const origin = (await readProject(page)).thoughts[id];
    await drag(page, placed, 70, 45);
    await expect.poll(async () => (await readProject(page)).thoughts[id].x).toBeCloseTo(origin.x + 70, 0);
    const moved = (await readProject(page)).thoughts[id];

    // One drag is one entry: a single Undo returns the previous position.
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await readProject(page)).thoughts[id].x).toBeCloseTo(origin.x, 0);
    await page.keyboard.press('Control+Shift+z');
    await expect.poll(async () => (await readProject(page)).thoughts[id].x).toBeCloseTo(moved.x, 0);

    // Redo re-armed the drag entry, so it is undone again before the wording is touched.
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await readProject(page)).thoughts[id].x).toBeCloseTo(origin.x, 0);
    // Undo the committed wording, then the creation itself.
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await readProject(page)).thoughts[id]?.text).toBe('');
    await page.keyboard.press('Control+z');
    await expect.poll(async () => Boolean((await readProject(page)).thoughts[id])).toBe(false);

    // Selection and camera are presentation, not content history.
    await page.locator('[data-thought-id="attention"]').click();
    const camera = (await readProject(page)).camera;
    await page.getByTestId('field').focus();
    await page.keyboard.press('Control+z');
    await expect(page.locator('[data-thought-id="attention"]')).toHaveAttribute('data-selected', 'true');
    expect((await readProject(page)).camera).toEqual(camera);
});

test('Find in Field guides to offscreen matches without stealing the camera', async ({ page }) => {
    const original = (await readProject(page)).camera;
    await page.getByTestId('field').focus();
    await page.keyboard.down('Space');
    await page.mouse.move(100, 500);
    await page.mouse.down();
    await page.mouse.move(1320, 500, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Space');
    await expect.poll(async () => (await readProject(page)).camera.x, { timeout: 8000 }).not.toBe(original.x);
    await expect(page.locator('[data-thought-id="attention"]')).toHaveCount(0);

    await page.keyboard.press('Control+f');
    const find = page.getByRole('dialog', { name: 'Find in Field' });
    await find.getByRole('textbox', { name: 'Find known content' }).fill('clarity');
    const cue = page.locator('.find-edge');
    await expect(cue).toHaveCount(1);
    const panned = (await readProject(page)).camera;
    await cue.click();
    await expect.poll(async () => (await readProject(page)).camera.x).not.toBe(panned.x);
    await expect(page.locator('[data-thought-id="attention"]')).toHaveAttribute('data-find', 'current');
    expect((await readProject(page)).camera.zoom).toBe(original.zoom);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-thought-id][data-find]')).toHaveCount(0);
});

test('Field export writes a real archive and a readable Markdown document', async ({ page }) => {
    const archiveDownload = page.waitForEvent('download');
    await openFieldMenu(page, 'export');
    const archive = await archiveDownload;
    expect(archive.suggestedFilename()).toBe('diffusion-project.json');
    const archivePath = await archive.path();
    const parsed = JSON.parse(fs.readFileSync(archivePath!, 'utf8'));
    expect(parsed.format).toBe('diffusion-project');
    expect(parsed.version).toBe(1);
    expect(Object.keys(parsed.project.thoughts).length).toBeGreaterThan(0);
    await expect(page.locator('.notice')).toContainText('Export prepared. Unclaimed possibilities and original file bytes are not included.');

    const documentDownload = page.waitForEvent('download');
    await openFieldMenu(page, 'export-markdown');
    const document = await documentDownload;
    expect(document.suggestedFilename()).toBe('diffusion-field.md');
    const text = fs.readFileSync((await document.path())!, 'utf8');
    expect(text).toContain('# Quiet, not empty');
    expect(text).toContain('## Still open');
    expect(text).toContain('Attention should change clarity');
    expect(text).toContain('## Stable commitments');
});

test('Field ownership covers duplicate and open without rewriting the current Field', async ({ page }) => {
    await openFieldMenu(page, 'duplicate-field');
    await expect(page.locator('.identity h1')).toContainText('(copy)');
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
    await page.getByTestId('field-title').click();
    await page.getByTestId('field-menu').locator('[data-command="open-field"]').click();
    const dialog = page.getByRole('dialog', { name: 'Open Field' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.field-list button')).toHaveCount(2);
    await dialog.locator('.field-list button').filter({ has: page.locator('span', { hasText: /^Quiet, not empty$/ }) }).click();
    await expect(page.locator('.identity h1')).toHaveText('Quiet, not empty');
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
});

test('shortcut help is derived from the command registry', async ({ page }) => {
    await page.getByTestId('global-more').click();
    await page.getByTestId('global-menu').locator('[data-command="shortcuts"]').click();
    const dialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-command="undo"]')).toContainText('Ctrl+Z');
    await expect(dialog.locator('[data-command="find"]')).toContainText('Ctrl+F');
    await expect(dialog.locator('[data-command="palette"]')).toContainText('Ctrl+K');
    await expect(dialog.locator('[data-command="settings"]')).toContainText('Ctrl+,');
    await expect(dialog.locator('[data-command="delete"]')).toContainText('Delete');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('global-more')).toBeFocused();
});
