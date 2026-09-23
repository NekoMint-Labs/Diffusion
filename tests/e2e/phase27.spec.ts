import { test, expect, type Page, type Locator } from '@playwright/test';

/** Phase 2.7 interaction precision.
 *
 * A real native review found that dragging selected Thoughts could replace the selection with
 * unrelated Thoughts. The cause was not the drag: it was that a press *anywhere* that was not a
 * Thought's own box — a few pixels low, or on the Scope Hub's own body — could be classified as blank
 * Field. Blank drag now belongs to navigation; deliberate Shift + blank drag owns marquee selection.
 *
 * These contracts hold the fix in place: a press decides the gesture once, a selection drag owns its
 * set until release, a marquee must cover a real part of a Thought, and cancellation decides
 * nothing.
 */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

const selected = async (page: Page) => (await page.locator('[data-selected="true"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-thought-id')!))).sort();
const center = async (locator: Locator) => { const box = await locator.boundingBox(); if (!box) throw new Error('no bounds'); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; };
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps });
    await page.mouse.up();
}
async function shiftDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12) {
    await page.keyboard.down('Shift');
    await drag(page, from, to, steps);
    await page.keyboard.up('Shift');
}
/** Two Thoughts selected, the way real use establishes a scope. */
async function scope(page: Page) {
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    expect(await selected(page)).toEqual(['attention', 'structure']);
}

test('a drag of one selected Thought across other Thoughts moves the scope and nothing else', async ({ page }) => {
    await scope(page);
    const from = await center(page.locator('[data-thought-id="attention"]'));
    // The path crosses structure (560,340), quiet (690,565) and proof (390,725) in world space.
    await drag(page, from, { x: from.x + 250, y: from.y + 420 });
    expect(await selected(page), 'the dragged scope is the scope that was grabbed').toEqual(['attention', 'structure']);
    await expect(page.getByTestId('scope-hub')).toContainText('2 thoughts');
});

test('a drag of two selected Thoughts collects no Thought it passes over', async ({ page }) => {
    await scope(page);
    const before = await selected(page);
    const from = await center(page.locator('[data-thought-id="attention"]'));
    await drag(page, from, { x: from.x - 40, y: from.y + 470 });
    expect(await selected(page)).toEqual(before);
    // The neighbours the drag passed over are still exactly that: neighbours.
    for (const key of ['crystal', 'proof', 'quiet'])
        await expect(page.locator(`[data-thought-id="${key}"]`)).toHaveAttribute('data-selected', 'false');
});

test('dragging one member of a scope moves every member, and a click on a member keeps the scope', async ({ page }) => {
    await scope(page);
    const attention = page.locator('[data-thought-id="attention"]');
    const structure = page.locator('[data-thought-id="structure"]');
    const start = await Promise.all([center(attention), center(structure)]);
    await drag(page, start[0], { x: start[0].x + 30, y: start[0].y + 60 });
    const moved = await Promise.all([center(attention), center(structure)]);
    expect(moved[0].x - start[0].x).toBeCloseTo(30, 0);
    expect(moved[1].x - start[1].x).toBeCloseTo(30, 0);
    expect(moved[1].y - start[1].y).toBeCloseTo(60, 0);
    expect(await selected(page)).toEqual(['attention', 'structure']);
    // A plain press on one member is not a way to throw the rest of the scope away.
    await attention.click();
    expect(await selected(page)).toEqual(['attention', 'structure']);
});

test('modifier selection still adds and removes explicitly', async ({ page }) => {
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    await page.locator('[data-thought-id="quiet"]').click({ modifiers: ['Shift'] });
    expect(await selected(page)).toEqual(['attention', 'quiet', 'structure']);
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    expect(await selected(page)).toEqual(['attention', 'quiet']);
});

test('Shift + blank drag marquee-selects what it covers', async ({ page }) => {
    // Nothing selected: Shift makes this a deliberate selection gesture from the first pixel.
    await shiftDrag(page, { x: 550, y: 130 }, { x: 1000, y: 700 }, 16);
    await expect(page.locator('[data-selected="true"]')).toHaveCount(3);
    expect(await selected(page)).toEqual(['attention', 'quiet', 'structure']);
});

test('a casual blank drag pans and never mutates the current scope', async ({ page }) => {
    await scope(page);
    const box = (await page.locator('[data-thought-id="attention"]').boundingBox())!;
    await drag(page, { x: box.x - 6, y: box.y + 6 }, { x: box.x + 10, y: box.y + box.height - 6 }, 10);
    await expect(page.locator('.selection-phenomena .lasso')).toBeHidden();
    expect(await selected(page), 'navigation does not reinterpret selection').toEqual(['attention', 'structure']);
});

test('a press on the Scope Hub drags the scope instead of drawing a marquee', async ({ page }) => {
    await scope(page);
    const hub = (await page.getByTestId('scope-hub').boundingBox())!;
    expect(await selected(page)).toEqual(['attention', 'structure']);
    const before = await center(page.locator('[data-thought-id="attention"]'));
    // Press the hub's own body, in the gap between its count and its first action.
    await drag(page, { x: hub.x + 4, y: hub.y + hub.height / 2 }, { x: hub.x + 4 + 60, y: hub.y + hub.height / 2 + 70 });
    const after = await center(page.locator('[data-thought-id="attention"]'));
    expect(after.x - before.x, 'the scope moved with the handle').toBeCloseTo(60, 0);
    expect(after.y - before.y).toBeCloseTo(70, 0);
    expect(await selected(page)).toEqual(['attention', 'structure']);
    await expect(page.locator('.selection-phenomena .lasso')).toBeHidden();
});

test('cancelling a gesture restores the Field and decides no selection', async ({ page }) => {
    await scope(page);
    const attention = page.locator('[data-thought-id="attention"]');
    const start = await center(attention);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 90, start.y + 40, { steps: 6 });
    const mid = await center(attention);
    expect(mid.x - start.x).toBeCloseTo(90, 0);
    await page.evaluate(() => document.querySelector('[data-testid="field"]')!.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true, cancelable: true })));
    await page.mouse.up();
    const settled = await center(attention);
    expect(settled.x, 'a cancelled drag leaves no trace in the world').toBeCloseTo(start.x, 0);
    expect(settled.y).toBeCloseTo(start.y, 0);
    expect(await selected(page)).toEqual(['attention', 'structure']);
});

test('a second press cannot re-classify a live gesture', async ({ page }) => {
    await scope(page);
    const attention = await center(page.locator('[data-thought-id="attention"]'));
    await page.mouse.move(attention.x, attention.y);
    await page.mouse.down();
    await page.mouse.move(attention.x + 60, attention.y + 20, { steps: 4 });
    // A middle-button press during a drag is ignored: it cannot turn the drag into a pan.
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(attention.x + 120, attention.y + 40, { steps: 4 });
    await page.mouse.up({ button: 'middle' });
    const moved = await center(page.locator('[data-thought-id="attention"]'));
    expect(moved.x - attention.x, 'the Thought still follows the pointer').toBeCloseTo(120, 0);
    await page.mouse.up();
    expect(await selected(page)).toEqual(['attention', 'structure']);
});

test('a Thought created on blank Field appears where placed without a circular Field halo', async ({ page }) => {
    await page.getByTestId('field').dblclick({ position: { x: 1000, y: 620 } });
    const editor = page.getByRole('textbox', { name: 'Edit thought' });
    await expect(editor).toBeVisible();
    const thought = editor.locator('xpath=ancestor::*[@data-thought-id]');
    const box = await thought.boundingBox();
    if (!box) throw new Error('the created Thought has no bounds');
    expect(Math.abs(box.x - 984)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.y - 600)).toBeLessThanOrEqual(2);
    expect(Math.hypot(box.x - 720, box.y - 480)).toBeGreaterThan(200);
    await expect(page.locator('.field-emergence')).toHaveCount(0);
});

test('every manual creation path avoids the retired circular Field halo', async ({ page }) => {
    await page.getByTestId('field').click({ button: 'right', position: { x: 980, y: 760 } });
    await page.getByRole('menuitem', { name: 'New thought', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Edit thought' })).toBeVisible();
    await expect(page.locator('.field-emergence')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Edit thought' }).press('Escape');

    await page.goto('/?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.click();
    await input.fill('The first thing I am willing to write down');
    await input.press('Enter');
    await expect(page.locator('[data-thought-id]')).toHaveCount(1);
    await expect(page.locator('.field-emergence')).toHaveCount(0);
});

test('reduced motion keeps creation understandable without adding a Field halo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByTestId('field').dblclick({ position: { x: 1000, y: 620 } });
    const thought = page.getByRole('textbox', { name: 'Edit thought' }).locator('xpath=ancestor::*[@data-thought-id]');
    await expect(thought).toBeVisible();
    await expect(thought).toHaveAttribute('data-selected', 'true');
    await expect(page.getByRole('textbox', { name: 'Edit thought' })).toBeFocused();
    await expect(page.locator('.field-emergence')).toHaveCount(0);
});

test('Help is a centred application place, and the Field recedes behind it', async ({ page }) => {
    await page.getByTestId('global-more').click();
    await page.getByRole('menuitem', { name: 'Help', exact: true }).click();
    const help = page.getByRole('dialog', { name: 'Help', exact: true });
    await expect(help).toBeVisible();
    const bounds = await help.boundingBox();
    if (!bounds) throw new Error('Help has no bounds');
    // The same spatial ownership Settings has: a window-level place in the middle of the window.
    expect(await help.getAttribute('data-level')).toBe('window');
    expect(Math.abs(bounds.x + bounds.width / 2 - 720)).toBeLessThan(24);
    expect(Math.abs(bounds.y + bounds.height / 2 - 480)).toBeLessThan(24);
    await expect(page.getByTestId('surface-input-shield')).toHaveCount(1);
    await expect(page.getByTestId('surface-input-shield')).toHaveAttribute('data-scrim', 'window');
    await expect(page.locator('.app')).toHaveAttribute('data-active-surface', 'help');
    await expect.poll(async () => page.locator('.field').evaluate(element => Number(getComputedStyle(element).opacity))).toBeCloseTo(.88, 2);
    await page.keyboard.press('Escape');
    await expect(help).toHaveCount(0);
    await expect(page.getByTestId('global-more')).toBeFocused();
    await expect.poll(async () => page.locator('.field').evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
});

test('the composer keeps Shift+Enter tertiary, inline, and focus-bound', async ({ page }) => {
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.focus();
    const speak = page.getByTestId('speak');
    const shortcut = speak.locator('.speak-shortcut');
    const row = speak.locator('.speak-row');
    await expect(shortcut).toBeVisible();
    // The focused shell has a layout arrival. Compare focus targets only after that authored
    // transition finishes; otherwise a slower renderer measures arrival as a shortcut-induced shift.
    await speak.evaluate(element => Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined))));
    expect((await shortcut.textContent()) ?? '').not.toContain('Esc');
    const [shell, rowBox, shortcutBox] = await Promise.all([speak.boundingBox(), row.boundingBox(), shortcut.boundingBox()]);
    if (!shell || !rowBox || !shortcutBox) throw new Error('Composer shortcut has no bounds');
    expect(shell.height).toBeGreaterThanOrEqual(40);
    expect(shell.height).toBeLessThanOrEqual(46);
    expect(shortcutBox.y).toBeGreaterThanOrEqual(rowBox.y);
    expect(shortcutBox.y + shortcutBox.height).toBeLessThanOrEqual(rowBox.y + rowBox.height);
    await speak.locator('.speak-action').focus();
    await expect(shortcut).toBeHidden();
    expect((await speak.boundingBox())?.height).toBeCloseTo(shell.height, 0);
    await input.focus();
    await input.fill('first');
    await input.press('Shift+Enter');
    await input.type('second');
    await expect(input).toHaveValue('first\nsecond');
    const multiline = await speak.boundingBox();
    expect(multiline?.height ?? 0).toBeGreaterThan(shell.height);
});

test('an IME composition can never become a commit, and the words survive it', async ({ page }) => {
    await page.goto('/?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const speak = page.getByTestId('speak');
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.click();
    await input.fill('还没想清楚的一件事');
    await expect(speak).toHaveAttribute('data-state', 'writing');
    // The Enter that confirms an IME candidate is not a decision about the Field.
    await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, keyCode: 229 });
    await expect(input).toHaveValue('还没想清楚的一件事');
    await expect(page.locator('[data-thought-id]')).toHaveCount(0);
    await expect(speak).toHaveAttribute('data-state', 'writing');
    // The commit itself still works, and it is the words that arrive.
    await input.press('Enter');
    await expect(page.locator('[data-thought-id]')).toHaveCount(1);
    await expect(page.locator('[data-thought-id]').first()).toContainText('还没想清楚的一件事');
});
