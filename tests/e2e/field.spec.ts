import { test, expect, type Page, type Locator } from '@playwright/test';
import { choose } from './selects.ts';
import type { ProjectState } from '../../src/core/model.ts';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)?.push(error.message)); await page.goto('/demo?locale=en'); await expect(page.getByTestId('field')).toBeVisible(); await expect(page.locator('[data-thought-id="attention"]')).toBeVisible(); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });
async function project(page: Page, id = 'demo'): Promise<ProjectState> { return page.evaluate(projectId => new Promise<ProjectState>((resolve, reject) => { const opening = indexedDB.open('diffusion-explorer-v1'); opening.onerror = () => reject(opening.error); opening.onsuccess = () => { const db = opening.result; const request = db.transaction('projects').objectStore('projects').get(projectId); request.onerror = () => { db.close(); reject(request.error); }; request.onsuccess = () => { db.close(); resolve(request.result as ProjectState); }; }; }), id); }
/** v0.3 ownership: the app menu, the Field menu and the selection menu are separate presentations. */
const APP_LABELS = ['Command Palette', 'Find in Field', 'Keyboard Shortcuts', 'Settings', 'Help'];
const FIELD_LABELS = ['Rename Field', 'New Field', 'Open Field...', 'Duplicate Field', 'Export', 'Export as Markdown', 'Import / Restore', 'How did this form?', 'Try a Fork...'];
async function menu(page: Page, label: string) {
    if (!APP_LABELS.includes(label) && !FIELD_LABELS.includes(label)) {
        if (label === 'Continue thinking...') {
            // The Thread place keeps its own entry: Continue thinking now opens the action's local
            // execution preview instead of a place to write in.
            await page.getByTestId('thought-more').click();
            await page.getByTestId('thought-menu').locator('[data-command="thread"]').click();
            return;
        }
        if (label === 'Continue from this Crystal') {
            await page.getByTestId('scope-continue').click();
            return;
        }
        await page.getByTestId('thought-more').click();
        const command = label === 'Crystallize...' ? 'crystallize' : null;
        const selectionMenu = page.getByTestId('thought-menu');
        if (command) {
            await selectionMenu.locator(`[data-command="${command}"]`).click();
            return;
        }
        await selectionMenu.getByRole('menuitem', { name: label, exact: true }).click();
        return;
    }
    const trigger = APP_LABELS.includes(label) ? page.getByTestId('global-more') : page.getByTestId('field-title');
    await trigger.click();
    const scope = APP_LABELS.includes(label) ? 'global' : 'field';
    const root = page.getByTestId(`${scope}-menu`);
    const direct = root.getByRole('menuitem', { name: label, exact: true });
    if (await direct.count()) {
        await direct.click();
        return;
    }
    await root.getByRole('menuitem', { name: 'More', exact: true }).click();
    await page.getByTestId(`${scope}-more-menu`).getByRole('menuitem', { name: label, exact: true }).click();
}

async function provider(page: Page, value: string) {
    await menu(page, 'Settings'); await choose(page, 'provider-select', value);
    await page.getByRole('button', { name: 'Return to Field' }).click();
}
async function place(page: Page, text: string, position = { x: 1120, y: 650 }) { await page.getByTestId('field').dblclick({ position }); const input = page.getByRole('textbox', { name: 'Edit thought', exact: true }); await input.fill(text); await input.press('Enter'); const thought = page.locator('[data-thought-id]').filter({ has: page.locator('p', { hasText: text }) }); await expect(thought).toBeVisible(); return thought; }
async function drag(page: Page, thought: Locator, dx: number, dy: number) { const b = await thought.boundingBox(); if (!b)
    throw new Error('Thought has no bounding box'); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 8 }); await page.mouse.up(); }
async function askOwnQuestion(page: Page) {
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
}
async function runQuestionPreview(page: Page) {
    await page.getByTestId('scope-question').click();
    await page.getByTestId('action-preview-run').click();
}
test('blank double-click, edit, cancel and reload preserve only committed wording', async ({ page }) => {
    const thought = await place(page, 'An unfinished but persistent question');
    const id = await thought.getAttribute('data-thought-id');
    await expect.poll(async () => Boolean((await project(page)).thoughts[id!])).toBe(true);
    await thought.dblclick();
    const input = page.getByRole('textbox', { name: 'Edit thought' });
    await input.fill('This wording should be cancelled');
    await input.press('Escape');
    await expect(thought).toContainText('An unfinished but persistent question');
    await page.reload();
    await expect(page.locator(`[data-thought-id="${id}"]`)).toContainText('An unfinished but persistent question');
});
test('Thought width is bounded by content and stays stable throughout an edit', async ({ page }) => {
    const compactMatch = await place(page, 'Qz');
    const compact = page.locator(`[data-thought-id="${await compactMatch.getAttribute('data-thought-id')}"]`);
    await expect(compact).toHaveAttribute('data-size', 'compact');
    const compactWidth = (await compact.boundingBox())!.width;

    await compact.dblclick();
    const editor = page.getByRole('textbox', { name: 'Edit thought' });
    await editor.fill('A much longer thought that needs several lines of context before its meaning becomes clear.');
    expect((await compact.boundingBox())!.width).toBeCloseTo(compactWidth, 0);
    await editor.press('Enter');
    await expect(compact).toHaveAttribute('data-size', 'wide');
    expect((await compact.boundingBox())!.width).toBeGreaterThan(compactWidth);

    const regular = await place(page, 'What if this is actually a different problem?', { x: 850, y: 820 });
    await expect(regular).toHaveAttribute('data-size', 'regular');
    const regularWidth = (await regular.boundingBox())!.width;
    expect(regularWidth).toBeGreaterThan(compactWidth);
    expect(regularWidth).toBeLessThan((await compact.boundingBox())!.width);
});

test('IME confirmation is not mistaken for an edit commit', async ({ page }) => {
    await page.getByTestId('field').dblclick({ position: { x: 1120, y: 650 } });
    const input = page.getByRole('textbox', { name: 'Edit thought' });
    await input.fill('\u8fd8\u6ca1\u6709\u6210\u5f62\u7684\u60f3\u6cd5');
    await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
    await expect(input).toBeVisible();
    await input.press('Enter');
    await expect(input).toHaveCount(0);
});
test('Delete removes selected Thoughts, Undo restores them, and text editing keeps Delete local', async ({ page }) => {
    const attention = page.locator('[data-thought-id="attention"]');
    await attention.click();
    await page.keyboard.press('Delete');
    await expect(attention).toHaveCount(0);
    await expect.poll(async () => Boolean((await project(page)).thoughts.attention)).toBe(false);

    await page.keyboard.press('Control+z');
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
    await expect.poll(async () => Boolean((await project(page)).thoughts.attention)).toBe(true);

    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press('Backspace');
    await expect(page.locator('[data-thought-id="attention"]')).toHaveCount(0);
    await expect(page.locator('[data-thought-id="structure"]')).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
    await expect(page.locator('[data-thought-id="structure"]')).toBeVisible();

    await page.locator('[data-thought-id="attention"]').dblclick();
    const editor = page.getByRole('textbox', { name: 'Edit thought', exact: true });
    await editor.fill('ABCDE');
    await editor.evaluate((element: HTMLTextAreaElement) => {
        element.focus();
        element.setSelectionRange(0, 0);
    });
    await page.keyboard.press('Delete');
    await expect(editor).toHaveValue('BCDE');
    await expect(page.locator('[data-thought-id="attention"]')).toHaveCount(1);

    const structure = page.locator('[data-thought-id="structure"]');
    await structure.dblclick();
    const switched = page.getByRole('textbox', { name: 'Edit thought', exact: true });
    await expect(switched).toHaveValue('Perhaps selection itself defines a temporary scope.');
    await switched.fill('This switch should still cancel locally');
    await switched.press('Escape');
    await expect(structure).toContainText('Perhaps selection itself defines a temporary scope.');
});

test('Delete removes an opened confirmed relation and Undo restores it', async ({ page }) => {
    await page.locator('[data-thought-id="attention"]').click();
    const token = page.getByRole('button', { name: /Confirmed relation: Attention reveals structure/ });
    await expect(token).toBeVisible();
    await token.click();
    await expect(page.getByRole('dialog', { name: 'Confirmed relation' })).toBeVisible();
    await page.keyboard.press('Delete');
    await expect(page.getByRole('dialog', { name: 'Confirmed relation' })).toHaveCount(0);
    await expect.poll(async () => Boolean((await project(page)).relations.seed)).toBe(false);

    await page.keyboard.press('Control+z');
    await expect.poll(async () => Boolean((await project(page)).relations.seed)).toBe(true);
    await page.locator('[data-thought-id="attention"]').click();
    await expect(page.getByRole('button', { name: /Confirmed relation: Attention reveals structure/ })).toBeVisible();
});

test('selection wakes existing relations without reflow, camera travel or AI', async ({ page }) => {
    const a = page.locator('[data-thought-id="attention"]');
    const before = await a.boundingBox();
    const camera = (await project(page)).camera;
    let requests = 0;
    page.on('request', request => { if (request.url().includes('/api/'))
        requests++; });
    await a.click();
    await expect(a).toHaveAttribute('data-selected', 'true');
    await expect(page.locator('[data-thought-id="structure"]')).toHaveAttribute('data-emphasis', 'direct');
    await expect(page.locator('[data-thought-id="proof"]')).toHaveAttribute('data-emphasis', 'receded');
    await expect(page.locator('.relation-label-overlay')).toHaveCount(1);
    expect(await a.boundingBox()).toEqual(before);
    expect((await project(page)).camera).toEqual(camera);
    expect(requests).toBe(0);
    await expect(page.locator('.thought.ghost')).toHaveCount(0);
    await page.getByTestId('field').click({ position: { x: 1320, y: 720 } });
    await expect(a).toHaveAttribute('data-selected', 'false');
    await expect(page.locator('.relation-label-overlay')).toHaveCount(0);
});
test('direct drag commits one final position and pan does not move the Thought', async ({ page }) => {
    const thought = page.locator('[data-thought-id="attention"]');
    const original = (await project(page)).thoughts.attention;
    await drag(page, thought, 80, 55);
    await expect.poll(async () => (await project(page)).thoughts.attention.x).toBeCloseTo(original.x + 80, 0);
    const moved = (await project(page)).thoughts.attention;
    await page.keyboard.down('Space');
    await page.mouse.move(1050, 730);
    await page.mouse.down();
    await page.mouse.move(1140, 780, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Space');
    await expect.poll(async () => (await project(page)).camera.x).toBeCloseTo(90, 0);
    expect((await project(page)).thoughts.attention.x).toBe(moved.x);
});
test('blank drag pans by default while F and 0 frame attention without a navigation mode', async ({ page }) => {
    const before = (await project(page)).camera;
    await page.mouse.move(1240, 820);
    await page.mouse.down();
    await page.mouse.move(1310, 860, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await project(page)).camera.x).toBeCloseTo(before.x + 70, 0);
    await expect(page.locator('[data-selected="true"]')).toHaveCount(0);

    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    await page.keyboard.press('f');
    await expect.poll(async () => (await project(page)).camera.zoom).toBeLessThanOrEqual(1.2);
    for (const id of ['attention', 'structure']) {
        const box = await page.locator(`[data-thought-id="${id}"]`).boundingBox();
        if (!box) throw new Error(`${id} is not visible after Focus`);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(1440);
        expect(box.y + box.height).toBeLessThanOrEqual(960);
    }

    await page.keyboard.press('0');
    await expect.poll(async () => (await project(page)).camera.zoom).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-selected="true"]')).toHaveCount(2);
});

test('multi-select and lasso do not create a group box or claim Ghosts', async ({ page }) => {
    await provider(page, 'demo');
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    await expect(page.locator('[data-selected="true"]')).toHaveCount(2);
    await runQuestionPreview(page);
    await expect(page.locator('.thought.ghost').first()).toBeVisible();
    const ghost = page.locator('.thought.ghost').first();
    const ghostId = await ghost.getAttribute('data-thought-id');
    if (!ghostId)
        throw new Error('Ghost has no identity');
    const lassoedGhost = page.locator(`[data-thought-id="${ghostId}"]`);
    const b = await lassoedGhost.boundingBox();
    if (!b)
        throw new Error('No Ghost bounds');
    await page.keyboard.down('Shift');
    await page.mouse.move(Math.max(1, b.x - 12), Math.max(1, b.y - 12));
    await page.mouse.down();
    await page.mouse.move(b.x + b.width + 12, b.y + b.height + 12, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await expect(lassoedGhost).toHaveAttribute('data-selected', 'true');
    expect((await project(page)).thoughts[ghostId]).toBeUndefined();
    await lassoedGhost.click();
    await expect(lassoedGhost).toHaveAttribute('data-kind', 'ghost');
    expect((await project(page)).thoughts[ghostId]).toBeUndefined();
    await page.keyboard.press('Enter');
    await expect(lassoedGhost).toHaveAttribute('data-kind', 'thought');
    await expect.poll(async () => Boolean((await project(page)).thoughts[ghostId])).toBe(true);
});
test('continue-thinking proposal does not inherit drag ownership from its source', async ({ page }) => {
    await provider(page, 'demo');
    const anchorThought = page.locator('[data-thought-id="attention"]');
    await anchorThought.click();
    await page.getByTestId('scope-continue').click();
    await page.getByTestId('action-preview-run').click();
    const firstGhost = page.locator('.thought.ghost').first();
    await expect(firstGhost).toBeVisible();
    const ghostId = await firstGhost.getAttribute('data-thought-id');
    if (!ghostId) throw new Error('proposal has no identity');
    const ghost = page.locator(`[data-thought-id="${ghostId}"]`);
    expect((await project(page)).thoughts[ghostId]).toBeUndefined();

    const anchorStart = await anchorThought.boundingBox();
    const ghostStart = await ghost.boundingBox();
    if (!anchorStart || !ghostStart) throw new Error('proposal bounds unavailable');
    await page.mouse.move(anchorStart.x + anchorStart.width / 2, anchorStart.y + anchorStart.height / 2);
    await page.mouse.down();
    await page.mouse.move(anchorStart.x + anchorStart.width / 2 + 46, anchorStart.y + anchorStart.height / 2 + 34, { steps: 6 });
    const ghostDuring = await ghost.boundingBox();
    if (!ghostDuring) throw new Error('proposal disappeared during source drag');
    expect(ghostDuring.x).toBeCloseTo(ghostStart.x, 0);
    expect(ghostDuring.y).toBeCloseTo(ghostStart.y, 0);
    await page.mouse.up();

    const ghostAfter = await ghost.boundingBox();
    if (!ghostAfter) throw new Error('proposal disappeared after source drag');
    expect(ghostAfter.x).toBeCloseTo(ghostStart.x, 0);
    expect(ghostAfter.y).toBeCloseTo(ghostStart.y, 0);
    await expect(ghost).toHaveAttribute('data-kind', 'ghost');
    expect((await project(page)).thoughts[ghostId]).toBeUndefined();
});

test('Thread snapshot scope changes only through Add current selection', async ({ page }) => {
    await page.locator('[data-thought-id="attention"]').click();
    const originalCamera = (await project(page)).camera;
    await menu(page, 'Continue thinking...');
    const thread = page.getByRole('dialog', { name: 'Thinking with', exact: true });
    await expect(thread).toBeVisible();
    await expect(thread.locator('.thread-scope span')).toHaveCount(1);
    await page.locator('[data-thought-id="structure"]').click();
    await expect(thread.locator('.thread-scope span')).toHaveCount(1);
    await thread.getByRole('button', { name: 'Add current selection' }).click();
    await expect(thread.locator('.thread-scope span')).toHaveCount(2);
    await thread.getByRole('button', { name: 'Go deeper' }).click();
    await expect(page.getByRole('dialog', { name: 'Deep Dive', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Return to Field' }).click();
    await expect.poll(async () => (await project(page)).camera).toEqual(originalCamera);
    await expect(page.locator('[data-thought-id="attention"]')).toHaveAttribute('data-selected', 'true');
});
test('Crystallize is a preview until explicit confirmation; Continue preserves it', async ({ page }) => {
    await page.locator('[data-thought-id="attention"]').click();
    await menu(page, 'Crystallize...');
    expect((await project(page)).thoughts.attention.kind).toBe('thought');
    await page.getByRole('textbox', { name: 'Your wording' }).fill('A chosen commitment');
    await page.getByRole('button', { name: 'Confirm this Crystal' }).click();
    await expect.poll(async () => (await project(page)).thoughts.attention.kind).toBe('crystal');
    await menu(page, 'Continue from this Crystal');
    const input = page.getByRole('textbox', { name: 'Edit thought' });
    await input.fill('A new line, not a rewritten commitment');
    await input.press('Enter');
    expect((await project(page)).thoughts.attention.text).toBe('A chosen commitment');
});
test('Find in Field reveals content in place and travels only on explicit navigation', async ({ page }) => {
    let requests = 0;
    page.on('request', request => { if (request.url().includes('/api/'))
        requests++; });
    const original = (await project(page)).camera;
    await page.keyboard.press('Control+f');
    const find = page.getByRole('dialog', { name: 'Find in Field' });
    await expect(find).toBeVisible();
    const query = find.getByRole('textbox', { name: 'Find known content' });
    await query.fill('clarity');
    await expect(page.locator('[data-thought-id="attention"]')).toHaveAttribute('data-find', 'current');
    await expect(page.locator('[data-find="dim"]').first()).toBeVisible();
    await expect(find.getByTestId('find-status')).toHaveText('1 / 1');
    expect((await project(page)).camera).toEqual(original);
    await query.press('Enter');
    await expect.poll(async () => (await project(page)).camera.x).not.toBe(original.x);
    await query.fill('nothing matches this phrase');
    await expect(find.getByTestId('find-status')).toHaveText('Nothing in this Field matches.');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-thought-id][data-find]')).toHaveCount(0);
    // Find is deterministic and local: no provider or evidence call is made.
    expect(requests).toBe(0);
});
test('unsupported files remain honest metadata-only Sources', async ({ page }) => {
    await menu(page, 'Import / Restore');
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Choose files', exact: true }).click();
    await (await chooser).setFiles({ name: 'unparsed.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nno usable document text') });
    await expect.poll(async () => Object.values((await project(page)).sources).find(s => s.title === 'unparsed.pdf')?.status).toBe('limited');
    const source = page.locator('[data-kind="source"]').filter({ hasText: 'unparsed.pdf' });
    await source.dblclick();
    await expect(page.getByRole('dialog', { name: 'unparsed.pdf' })).toContainText(/metadata/i);
    expect(Object.values((await project(page)).sources)[0].excerpt).toBe('');
});
test('manual Field stays editable while an explicitly configured request is pending', async ({ page }) => {
    await page.route('**/api/respond', async (route) => { await new Promise(resolve => setTimeout(resolve, 1000)); await route.fulfill({ json: { providerLabel: 'E2E stub / not live', mock: true, intents: [{ type: 'surface_possibility', text: 'Only a test possibility.' }] } }); });
    await menu(page, 'Settings');
    await choose(page, 'provider-select', 'gateway');
    await page.getByRole('button', { name: 'Return to Field' }).click();
    await page.getByRole('textbox', { name: 'Speak', exact: true }).fill('An explicit question');
    await page.getByRole('textbox', { name: 'Speak', exact: true }).press('Enter');
    await place(page, 'Placed during the provider request');
    await expect(page.locator('[data-thought-id]').filter({ hasText: 'Placed during the provider request' })).toBeVisible();
});
test('Light, Dark and reduced motion retain a common layout', async ({ page }, testInfo) => {
    const a = page.locator('[data-thought-id="attention"]');
    const before = await a.boundingBox();
    await menu(page, 'Settings');
    await choose(page, 'style-profile-select', 'graphite-night');
    await page.getByRole('button', { name: 'Return to Field' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await a.boundingBox()).toEqual(before);
    await page.screenshot({ path: testInfo.outputPath('dark.png') });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await menu(page, 'Settings');
    await choose(page, 'style-profile-select', 'editorial-warm');
    await page.getByRole('button', { name: 'Return to Field' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await a.click();
    await expect(page.getByTestId('scope-hub')).toBeVisible();
    await page.getByTestId('scope-question').click();
    await expect(page.getByRole('dialog', { name: 'Generate a question', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('scope-hub')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('light.png') });
});
test('Speak takes focus and keeps input when Ask rapidly re-establishes scope', async ({ page }) => {
    const words = 'Keep this unfinished wording';
    const speak = page.getByRole('textbox', { name: 'Speak', exact: true });
    await speak.click();
    await speak.fill(words);

    await page.locator('[data-thought-id="attention"]').click();
    await expect(page.getByTestId('scope-hub')).toBeVisible();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();

    const scoped = page.getByRole('textbox', { name: 'Speak', exact: true });
    await expect(scoped).toBeFocused();
    await expect(scoped).toHaveValue(words);
    await expect(page.getByTestId('speak')).toHaveCount(1);
    await expect(scoped).toHaveCount(1);
    await expect(page.getByTestId('speak')).toHaveAttribute('data-composing', 'true');
    await expect(page.getByTestId('speak')).toHaveAttribute('data-scope-active', 'true');
    expect(await page.getByTestId('speak').evaluate(element => getComputedStyle(element).pointerEvents)).not.toBe('none');

    await scoped.press('End');
    await scoped.pressSequentially(' — still here');
    await expect(scoped).toHaveValue(`${words} — still here`);
});
test('large projects are culled and zoom changes representation', async ({ page }) => {
    await page.goto('/perf?count=5000');
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.locator('[data-thought-id]').first()).toBeVisible();
    expect(await page.locator('[data-thought-id]').count()).toBeLessThan(240);
    await page.mouse.move(700, 450);
    for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 300);
        await page.waitForTimeout(160);
    }
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'atlas');
    await expect(page.locator('[data-kind="thought"]')).toHaveCount(0);
});

test('Scope Hub follows selection geometry and transfers exact scope to Speak', async ({ page }) => {
    await provider(page, 'demo');
    const idleSpeak = page.getByTestId('speak');
    await expect(page.getByRole('textbox', { name: 'Speak', exact: true })).toHaveAttribute('placeholder', 'Continue thinking...');
    const idleWidth = (await idleSpeak.boundingBox())!.width;
    expect(idleWidth).toBe(250);
    const attention = page.locator('[data-thought-id="attention"]');
    const structure = page.locator('[data-thought-id="structure"]');
    const before = await project(page);
    await attention.click();
    await expect(page.getByTestId('scope-hub')).toBeVisible();
    await expect(page.getByTestId('speak')).toHaveCount(0);
    await structure.click({ modifiers: ['Shift'] });
    const hub = page.getByTestId('scope-hub');
    await expect(hub).toContainText('2 thoughts');
    const selected = await page.locator('[data-selected="true"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-thought-id')));
    expect(selected.sort()).toEqual(['attention', 'structure']);
    const selectedBounds = await Promise.all(selected.map(id => page.locator(`[data-thought-id="${id}"]`).boundingBox()));
    const hubBounds = await hub.boundingBox();
    if (!hubBounds || selectedBounds.some(bounds => !bounds)) throw new Error('Scope geometry is unavailable');
    for (const bounds of selectedBounds) expect(hubBounds.y >= bounds!.y + bounds!.height || hubBounds.y + hubBounds.height <= bounds!.y || hubBounds.x >= bounds!.x + bounds!.width || hubBounds.x + hubBounds.width <= bounds!.x).toBe(true);
    await askOwnQuestion(page);
    await expect(hub).toHaveCount(0);
    const scopedSpeak = page.getByTestId('speak');
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await expect(input).toBeFocused();
    const shell = scopedSpeak.locator('.speak-shell');
    const scopeLabel = shell.locator('.speak-scope');
    await expect(scopeLabel).toHaveText('Thinking with 2 thoughts');
    const [scopeBounds, inputBounds, shellBounds] = await Promise.all([scopeLabel.boundingBox(), input.boundingBox(), shell.boundingBox()]);
    if (!scopeBounds || !inputBounds || !shellBounds) throw new Error('Speak composition geometry is unavailable');
    expect(scopeBounds.y + scopeBounds.height).toBeLessThanOrEqual(inputBounds.y);
    // Phase 2.7 wrote this as "the writing owns more than 70 % of the shell", which held while the
    // focused row carried two items. The row now also carries the Shift+Enter disclosure cue, so the
    // claim that survives is the relative one: the writing is the widest item in its own row, and the
    // row's order is writing, disclosure, action. The comments above stand; only the ratio is gone.
    const actionBounds = await scopedSpeak.locator('.speak-action').boundingBox();
    if (!actionBounds) throw new Error('the composing action has no bounds');
    const shortcutBounds = await scopedSpeak.locator('.speak-shortcut').boundingBox();
    if (!shortcutBounds) throw new Error('the composing disclosure has no bounds');
    expect(inputBounds.width).toBeGreaterThan(shortcutBounds.width);
    expect(inputBounds.width).toBeGreaterThan(actionBounds.width);
    expect(shortcutBounds.x + shortcutBounds.width).toBeLessThanOrEqual(actionBounds.x + 1);
    expect(inputBounds.x + inputBounds.width).toBeLessThanOrEqual(actionBounds.x + 1);
    expect(actionBounds.x + actionBounds.width).toBeLessThanOrEqual(shellBounds.x + shellBounds.width + 1);
    expect(actionBounds.y + actionBounds.height / 2).toBeGreaterThan(inputBounds.y);
    expect(actionBounds.y + actionBounds.height / 2).toBeLessThan(inputBounds.y + inputBounds.height);
    expect(await shell.evaluate(element => { const textarea = element.querySelector('textarea')!; return element.firstElementChild?.compareDocumentPosition(textarea) === Node.DOCUMENT_POSITION_FOLLOWING; })).toBe(true);
    expect(await shell.evaluate(element => ({ position: getComputedStyle(element).position, baselineBottom: getComputedStyle(element, '::after').bottom }))).toEqual({ position: 'relative', baselineBottom: '0px' });
    const composingBounds = await scopedSpeak.boundingBox();
    expect(composingBounds!.width).toBe(480);
    await input.fill('First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line');
    const multiline = await input.evaluate(element => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY, width: element.getBoundingClientRect().width }));
    expect(multiline.clientHeight).toBe(108);
    expect(multiline.scrollHeight).toBeGreaterThan(multiline.clientHeight);
    expect(multiline.overflowY).toBe('auto');
    // The lane stays a lane: focusing gives the writing more room than the composer's own idle width,
    // even with the disclosure cue and the one action sharing its row.
    expect(multiline.width).toBeGreaterThan(idleWidth);
    await input.fill('What could connect these?');
    await input.press('Escape');
    await expect(scopedSpeak).toHaveCount(0);
    await expect(hub).toBeVisible();
    await expect(page.locator('[data-selected="true"]')).toHaveCount(2);
    await askOwnQuestion(page);
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('What could connect these?');
    await input.press('Enter');
    await expect(page.locator('.thought.ghost').first()).toBeVisible();
    const demoNotice = page.locator('.notice[data-secondary="demo"]');
    await expect(demoNotice).toBeVisible();
    expect((await demoNotice.boundingBox())!.y).toBeLessThan(100);
    expect((await project(page)).thoughts.attention).toMatchObject({ x: before.thoughts.attention.x, y: before.thoughts.attention.y });
    await page.getByTestId('field').click({ position: { x: 80, y: 880 } });
    await expect(page.getByTestId('scope-hub')).toHaveCount(0);
    await expect(page.getByTestId('speak')).toBeVisible();
    await expect.poll(async () => (await page.getByTestId('speak').boundingBox())!.width).toBeCloseTo(250, 0);
});

test('Settings opens as a dedicated centred surface, not a corner panel', async ({ page }) => {
    await menu(page, 'Settings');
    const settings = page.getByRole('dialog', { name: 'Field settings', exact: true });
    const bounds = await settings.boundingBox();
    if (!bounds) throw new Error('Settings bounds are unavailable');
    // A place the product owns: inset from every edge, wide enough to hold section navigation,
    // and centred rather than attached to the top-right corner.
    expect(bounds.width).toBeGreaterThan(600);
    expect(bounds.x).toBeGreaterThan(80);
    expect(bounds.x + bounds.width).toBeLessThan(1360);
    expect(bounds.y).toBeGreaterThan(50);
    expect(bounds.y + bounds.height).toBeLessThan(910);
    expect(Math.abs(bounds.x + bounds.width / 2 - 720)).toBeLessThan(24);
    await page.keyboard.press('Escape');
});

test('demo content and scoped copy follow the active locale', async ({ page }) => {
    await page.goto('/demo?locale=zh');
    await expect(page.locator('[data-thought-id="attention"]')).toContainText('注意力应该改变清晰度');
    await page.locator('[data-thought-id="attention"]').click();
    // With one Thought selected the outward-thinking action is phrased as an intent, not an implementation name.
    await expect(page.getByTestId('scope-hub')).toContainText('换个角度');
    await expect(page.getByTestId('scope-question')).toHaveText('生成一个问题');
    await page.getByTestId('scope-question').click();
    await expect(page.getByRole('dialog', { name: '生成一个问题', exact: true })).toBeVisible();
    await page.goto('/demo?locale=en');
    await expect(page.locator('[data-thought-id="attention"]')).toContainText('Attention should change clarity');
});

test('demo Recall uses the real runtime wake pathway', async ({ page }) => {
    await provider(page, 'demo');
    await page.locator('[data-thought-id="attention"]').click();
    await askOwnQuestion(page);
    await page.getByRole('textbox', { name: 'Speak', exact: true }).fill('earlier');
    await page.getByRole('textbox', { name: 'Speak', exact: true }).press('Enter');
    const earlier = page.locator('[data-thought-id="earlier"]');
    await expect(earlier).toBeVisible();
    await page.getByTestId('field').focus();
    await page.keyboard.down('Space');
    await page.mouse.move(300, 700);
    await page.mouse.down();
    await page.mouse.move(900, 700, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Space');
    await earlier.click();
    await expect(earlier).toHaveAttribute('data-life', 'active');
    await expect(earlier).toHaveAttribute('data-selected', 'true');
});


test('Speak exposes a forgiving quiet writing lane instead of glyph-only entry', async ({ page }) => {
    const speak = page.getByTestId('speak');
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    const shell = speak.locator('.speak-shell');
    const idle = await speak.boundingBox();
    if (!idle) throw new Error('Speak bounds are unavailable');
    expect(idle.width).toBeGreaterThanOrEqual(230);
    expect(idle.width).toBeLessThanOrEqual(280);
    expect(idle.height).toBeGreaterThanOrEqual(40);
    expect(await speak.evaluate(element => getComputedStyle(element).cursor)).toBe('text');
    // Idle it is part of the Field: no material, no depth, only a short anchor tick.
    const resting = await shell.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, shadow: getComputedStyle(element).boxShadow, tick: Number(getComputedStyle(element, '::after').opacity) }));
    expect(resting.background).toBe('rgba(0, 0, 0, 0)');
    expect(resting.shadow).toBe('none');
    expect(resting.tick).toBeLessThan(0.3);

    await page.mouse.click(idle.x + idle.width / 2, idle.y + 3);
    await expect(input).toBeFocused();
    await expect(speak).toHaveAttribute('data-composing', 'true');
    await expect.poll(async () => (await speak.boundingBox())!.width).toBeCloseTo(480, 0);
    // Focused, the shell materializes: a real surface with depth, and the one action is in front
    // of the writer. This is decided by `data-composing`, so it holds with zero motion running.
    const material = await shell.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, shadow: getComputedStyle(element).boxShadow }));
    expect(material.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(material.shadow).not.toBe('none');
    await expect(speak.locator('.speak-action')).toBeVisible();
    await expect(speak.locator('.speak-action-label')).toHaveText('Think');

    await input.press('Escape');
    await expect(speak).toHaveAttribute('data-composing', 'false');
    await expect.poll(async () => (await speak.boundingBox())!.width).toBeCloseTo(250, 0);
    const reset = await speak.boundingBox();
    if (!reset) throw new Error('Reset Speak bounds are unavailable');
    await page.mouse.click(reset.x + reset.width / 2, reset.y + reset.height - 3);
    await expect(input).toBeFocused();
    expect(await input.getAttribute('tabindex')).not.toBe('-1');
});

test('Scope actions keep text styling while exposing distinct accessible targets', async ({ page }) => {
    await provider(page, 'demo');
    const thought = page.locator('[data-thought-id="attention"]');
    await thought.click();
    const hub = page.getByTestId('scope-hub');
    const actions = hub.locator('.scope-actions button');
    await expect(actions).toHaveCount(4);
    const boxes = await actions.evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
    }));
    // 36 px was the Phase 2 pin. The contextual toolbar is now the compact control size that
    // `materials.css` owns, so the claim this test's name makes — distinct, accessible targets — is
    // the accessibility floor: WCAG 2.2 SC 2.5.8 asks for 24 × 24 CSS px.
    for (const box of boxes) expect(box.height).toBeGreaterThanOrEqual(24);
    for (let index = 1; index < boxes.length; index++) expect(boxes[index - 1].x + boxes[index - 1].width).toBeLessThanOrEqual(boxes[index].x);

    const angle = page.getByTestId('scope-angle');
    await angle.click({ position: { x: 3, y: 3 } });
    // Another angle states its run before it starts, so the same action still answers the same click.
    await expect(page.getByRole('dialog', { name: 'Another angle', exact: true })).toBeVisible();
    await page.getByTestId('action-preview-run').click();
    await expect(page.locator('.thought.ghost').first()).toBeVisible();

    const question = page.getByTestId('scope-question');
    // The actions stay distinct, ordered keyboard targets. Focus is placed on the first one because
    // starting the run above closed and reopened the Hub around its own preview.
    await angle.focus();
    await page.keyboard.press('Tab');
    await expect(question).toBeFocused();
    expect(await question.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
    await question.click({ position: { x: 3, y: 3 } });
    await expect(page.getByRole('dialog', { name: 'Generate a question', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');

    const keepThinking = page.getByTestId('scope-continue');
    const keepBox = await keepThinking.boundingBox();
    if (!keepBox) throw new Error('Continue target bounds are unavailable');
    await keepThinking.click({ position: { x: keepBox.width - 3, y: keepBox.height - 3 } });
    await expect(page.getByRole('dialog', { name: 'Continue thinking', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');

    // The place to write in is still one explicit click away, through the same More target.
    await page.getByRole('button', { name: 'More thought actions', exact: true }).click();
    await page.getByTestId('thought-menu').locator('[data-command="thread"]').click();
    const thread = page.getByRole('dialog', { name: 'Thinking with', exact: true });
    await expect(thread).toBeVisible();
    // Escape is pressed once the menu that opened the place has finished closing, so the key is the
    // Thread's to handle rather than the closing popup's.
    await expect(page.getByTestId('thought-menu')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(thread).toHaveCount(0);
    await expect(page.getByTestId('field')).toBeFocused();

    const more = page.getByRole('button', { name: 'More thought actions', exact: true });
    expect((await more.boundingBox())!.width).toBeGreaterThanOrEqual(24);
    await more.focus();
    await expect(more).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('thought-menu')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId('field').click({ position: { x: 1320, y: 720 } });
    await expect(hub).toHaveCount(0);
    await drag(page, thought, 24, 18);
});

test('Explore and Question results retain exact local source continuity without camera travel', async ({ page }) => {
    await provider(page, 'demo');
    const attention = page.locator('[data-thought-id="attention"]');
    const structure = page.locator('[data-thought-id="structure"]');
    await attention.click();
    await structure.click({ modifiers: ['Shift'] });
    const before = await project(page);
    const camera = before.camera;
    const sourceBoxes = await Promise.all([attention.boundingBox(), structure.boundingBox()]);
    if (sourceBoxes.some(box => !box)) throw new Error('Source bounds are unavailable');
    const left = Math.min(...sourceBoxes.map(box => box!.x));
    const top = Math.min(...sourceBoxes.map(box => box!.y));
    const right = Math.max(...sourceBoxes.map(box => box!.x + box!.width));
    const bottom = Math.max(...sourceBoxes.map(box => box!.y + box!.height));

    // Two sources are the relation probe, not the Explore path: the Scope Hub labels it "Find a
    // relation" and the answer is a candidate relation over this exact scope, with no possibility.
    // (`ACTION_OUTPUTS.probe` has admitted only `surface_relation` since Phase 3A.)
    await page.getByTestId('scope-find-relation').click();
    await expect(page.getByTestId('scope-find-relation')).toHaveText('Find a relation');
    await expect(page.locator('.relation.tentative')).toBeVisible();
    await expect(attention).toHaveAttribute('data-selected', 'true');
    await expect(structure).toHaveAttribute('data-selected', 'true');
    expect((await project(page)).camera).toEqual(camera);
    expect((await project(page)).thoughts.attention).toMatchObject({ x: before.thoughts.attention.x, y: before.thoughts.attention.y });
    expect((await project(page)).thoughts.structure).toMatchObject({ x: before.thoughts.structure.x, y: before.thoughts.structure.y });

    await runQuestionPreview(page);
    // The Hub's third action generates questions now, so the result is identified by what it is — a
    // question proposal over this exact scope — rather than by the mock's wording for one of them.
    const questionResult = page.locator('.thought.ghost[data-proposal-kind="question"][data-origin-scope="attention structure"]').first();
    await expect(questionResult).toBeVisible();
    await expect(questionResult).toHaveAttribute('data-origin-scope', 'attention structure');
    const questionBounds = await questionResult.boundingBox();
    if (!questionBounds) throw new Error('Question result bounds are unavailable');
    // A possibility is placed against its own scope: outside the sources, close to the scope, and
    // inside the viewport without camera travel.
    expect(questionBounds.x >= right || questionBounds.x + questionBounds.width <= left || questionBounds.y >= bottom || questionBounds.y + questionBounds.height <= top).toBe(true);
    expect(Math.hypot(questionBounds.x + questionBounds.width / 2 - (left + right) / 2, questionBounds.y + questionBounds.height / 2 - (top + bottom) / 2)).toBeLessThan(700);
    expect(questionBounds.x).toBeGreaterThanOrEqual(0);
    expect(questionBounds.y).toBeGreaterThanOrEqual(0);
    expect(questionBounds.x + questionBounds.width).toBeLessThanOrEqual(1440);
    expect(questionBounds.y + questionBounds.height).toBeLessThanOrEqual(960);
    expect((await project(page)).camera).toEqual(camera);
});


test('three-Thought lasso keeps one outside Hub independent of release direction', async ({ page }) => {
    await provider(page, 'demo');
    const before = await project(page);
    const field = page.getByTestId('field');
    const dragLasso = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
        await page.keyboard.down('Shift');
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(to.x, to.y, { steps: 8 });
        await page.mouse.up();
        await page.keyboard.up('Shift');
    };

    await dragLasso({ x: 550, y: 130 }, { x: 980, y: 680 });
    await expect(page.locator('[data-selected="true"]')).toHaveCount(3);
    const selected = (await page.locator('[data-selected="true"]').evaluateAll(elements => elements.map(element => element.getAttribute('data-thought-id')!))).sort();
    expect(selected).toEqual(['attention', 'quiet', 'structure']);
    const hub = page.getByTestId('scope-hub');
    const firstHub = await hub.boundingBox();
    const selectedBoxes = await Promise.all(selected.map(key => page.locator(`[data-thought-id="${key}"]`).boundingBox()));
    if (!firstHub || selectedBoxes.some(box => !box)) throw new Error('Multi-selection geometry is unavailable');
    const left = Math.min(...selectedBoxes.map(box => box!.x));
    const top = Math.min(...selectedBoxes.map(box => box!.y));
    const right = Math.max(...selectedBoxes.map(box => box!.x + box!.width));
    const bottom = Math.max(...selectedBoxes.map(box => box!.y + box!.height));
    expect(firstHub.x >= right || firstHub.x + firstHub.width <= left || firstHub.y >= bottom || firstHub.y + firstHub.height <= top).toBe(true);

    await field.click({ position: { x: 60, y: 650 } });
    await expect(hub).toHaveCount(0);
    await dragLasso({ x: 980, y: 680 }, { x: 550, y: 130 });
    await expect(page.locator('[data-selected="true"]')).toHaveCount(3);
    const reverseHub = await hub.boundingBox();
    if (!reverseHub) throw new Error('Reverse-lasso Hub bounds are unavailable');
    expect(Math.abs(reverseHub.x - firstHub.x)).toBeLessThan(2);
    expect(Math.abs(reverseHub.y - firstHub.y)).toBeLessThan(2);
    expect(await hub.getAttribute('data-scope-side')).toBeTruthy();

    await page.getByTestId('scope-angle').click();
    await page.getByTestId('action-preview-run').click();
    const ghost = page.locator('.thought.ghost').first();
    await expect(ghost).toBeVisible();
    expect((await ghost.getAttribute('data-origin-scope'))!.split(' ').sort()).toEqual(selected);
    expect((await project(page)).camera).toEqual(before.camera);
    for (const key of selected) expect((await project(page)).thoughts[key]).toMatchObject({ x: before.thoughts[key].x, y: before.thoughts[key].y });
});


test('interaction layers keep an occluded Scope Hub legible and clickable without moving content', async ({ page }) => {
    await provider(page, 'demo');
    const source = page.locator('[data-thought-id="attention"]');
    const behind = page.locator('[data-thought-id="proof"]');
    const canonical = (await project(page)).thoughts.proof;
    await source.click();
    const hub = page.getByTestId('scope-hub');
    const hubBox = await hub.boundingBox();
    if (!hubBox) throw new Error('Scope Hub bounds are unavailable');
    await behind.evaluate((element, point) => { (element as HTMLElement).style.transform = `translate(${point.x + 30}px, ${point.y}px)`; }, hubBox);
    const behindBox = await behind.boundingBox();
    if (!behindBox) throw new Error('Occluding Thought bounds are unavailable');
    expect(behindBox.x).toBeLessThan(hubBox.x + hubBox.width);
    expect(behindBox.y).toBeLessThan(hubBox.y + hubBox.height);

    const presentation = await hub.evaluate(element => {
        const backing = getComputedStyle(element, '::before');
        // `color-mix()` computes to either `color(srgb … / a)` or `rgba(…)` depending on the engine,
        // so the alpha is read from whichever syntax the browser actually produced.
        const fill = backing.backgroundColor;
        const slash = fill.match(/\/\s*([\d.]+)\s*\)/);
        const rgba = fill.match(/rgba\(([^)]+)\)/);
        return {
            hubPointer: getComputedStyle(element).pointerEvents,
            actionPointer: getComputedStyle(element.querySelector('button')!).pointerEvents,
            backingAlpha: slash ? Number(slash[1]) : rgba ? Number(rgba[1].split(',')[3] ?? 1) : 1,
            backingEdge: backing.borderTopWidth,
            scopeLayer: Number(getComputedStyle(document.documentElement).getPropertyValue('--layer-scope')),
            thoughtLayer: Number(getComputedStyle(document.documentElement).getPropertyValue('--layer-thought')),
        };
    });
    expect(presentation.scopeLayer).toBeGreaterThan(presentation.thoughtLayer);
    expect(presentation.hubPointer).toBe('none');
    expect(presentation.actionPointer).toBe('auto');
    // The Hub stays in the scope layer and uses only a low-alpha Field veil: enough separation for
    // text over content, without reintroducing a card border or elevation. The click below proves
    // that its actions still own input while the overlapped Thought remains unmoved.
    expect(presentation.backingAlpha, 'the Hub uses a quiet Field veil').toBeGreaterThanOrEqual(0.4);
    expect(presentation.backingAlpha, 'the Hub does not become an opaque card').toBeLessThanOrEqual(0.5);
    expect(presentation.backingEdge, 'the Hub has no card boundary').toBe('0px');
    await page.getByTestId('scope-angle').click();
    await page.getByTestId('action-preview-run').click();
    await expect(page.locator('.thought.ghost').first()).toBeVisible();
    expect((await project(page)).thoughts.proof).toMatchObject({ x: canonical.x, y: canonical.y });

    await page.getByTestId('field').click({ position: { x: 80, y: 880 } });
    await expect(hub).toHaveCount(0);
});

test('composing Speak masks underlying Crystal text and leaves outside Field input available', async ({ page }) => {
    const source = page.locator('[data-thought-id="attention"]');
    const behind = page.locator('[data-kind="crystal"]').first();
    const id = await behind.getAttribute('data-thought-id');
    if (!id) throw new Error('Crystal identity is unavailable');
    const canonical = (await project(page)).thoughts[id];
    await source.click();
    await askOwnQuestion(page);
    const speak = page.getByTestId('speak');
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    const speakBox = await speak.boundingBox();
    if (!speakBox) throw new Error('Speak bounds are unavailable');
    await behind.evaluate((element, point) => { (element as HTMLElement).style.transform = `translate(${point.x + 45}px, ${point.y + 8}px)`; }, speakBox);
    const behindBox = await behind.boundingBox();
    if (!behindBox) throw new Error('Occluding Crystal bounds are unavailable');
    expect(behindBox.y).toBeLessThan(speakBox.y + speakBox.height);

    await expect(speak.locator('.speak-scope')).toBeVisible();
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('placeholder', 'Write down something not yet clear...');
    const presentation = await speak.evaluate(element => {
        const shell = element.querySelector('.speak-shell')!;
        const fill = getComputedStyle(shell).backgroundColor;
        // `color-mix()` computes to either `color(srgb … / a)` or `rgba(…)` depending on the engine,
        // so the alpha is read from whichever syntax the browser actually produced.
        const slash = fill.match(/\/\s*([\d.]+)\s*\)/);
        const rgba = fill.match(/rgba\(([^)]+)\)/);
        const alpha = slash ? Number(slash[1]) : rgba ? Number(rgba[1].split(',')[3] ?? 1) : 1;
        return {
            mask: getComputedStyle(shell, '::before').backgroundImage,
            fillAlpha: alpha,
            depth: getComputedStyle(shell).boxShadow !== 'none',
            wrapperPointer: getComputedStyle(element.parentElement!).pointerEvents,
            speakPointer: getComputedStyle(element).pointerEvents,
            speakLayer: Number(getComputedStyle(document.documentElement).getPropertyValue('--layer-speak')),
            thoughtLayer: Number(getComputedStyle(document.documentElement).getPropertyValue('--layer-thought')),
        };
    });
    expect(presentation.speakLayer).toBeGreaterThan(presentation.thoughtLayer);
    // What masks the Crystal underneath is the writing surface itself: an almost-opaque fill with
    // real depth. (The full-width hairline was removed in the Phase 2.6 redesign because at 1px it
    // masked nothing, and a later simplification dropped the separate `::before` mask layer too — the
    // fill alone is opaque enough to hide what it covers.)
    expect(presentation.fillAlpha, 'the composing surface is opaque enough to mask what it covers').toBeGreaterThanOrEqual(0.9);
    expect(presentation.depth, 'and it carries depth rather than being a painted line').toBe(true);
    expect(presentation.wrapperPointer).toBe('none');
    expect(presentation.speakPointer).toBe('auto');
    await input.fill('First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line');
    await expect(input).toHaveValue(/Sixth line/);
    expect((await project(page)).thoughts[id]).toMatchObject({ x: canonical.x, y: canonical.y });

    await page.keyboard.down('Shift');
    await page.mouse.move(70, 680);
    await page.mouse.down();
    await page.mouse.move(180, 780, { steps: 6 });
    await expect(page.locator('.selection-phenomena .lasso')).toBeVisible();
    await page.mouse.up();
    await page.keyboard.up('Shift');
    // A lasso only ever adds to the selection, so the blank click is what clears attention and hands
    // the idle writing lane back.
    await page.mouse.click(70, 680);
    await expect(speak).toHaveAttribute('data-composing', 'false');
});
