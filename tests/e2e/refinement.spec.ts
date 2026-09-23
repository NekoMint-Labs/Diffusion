import { test, expect, type Page } from '@playwright/test';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });
/** Samples the rendered transform/opacity of a selector for a while, so an "we added
 * animation" claim is measured in real frames rather than asserted about the source. */
async function sampleFrames(page: Page, selector: string, ms: number) {
    await page.evaluate(({ target, duration }: { target: string; duration: number }) => {
        const marker = window as unknown as { __frames: unknown[] };
        marker.__frames = [];
        let observed: HTMLElement | null = null;
        let started = 0;
        const observer = new MutationObserver(() => {
            const element = document.querySelector<HTMLElement>(target);
            if (element) begin(element);
        });
        const begin = (element: HTMLElement) => {
            if (observed) return;
            observed = element;
            observer.disconnect();
            requestAnimationFrame(tick);
        };
        const tick = (now: number) => {
            if (!observed?.isConnected) return;
            if (!started) started = now;
            const style = getComputedStyle(observed);
            const matrix = style.transform === 'none' ? null : new DOMMatrix(style.transform);
            marker.__frames.push({ scale: matrix ? matrix.a : 1, x: matrix ? matrix.e : 0, y: matrix ? matrix.f : 0, opacity: Number(style.opacity), at: Math.round(now - started) });
            if (now - started < duration) requestAnimationFrame(tick);
        };
        observer.observe(document.body, { childList: true, subtree: true });
        const existing = document.querySelector<HTMLElement>(target);
        if (existing) begin(existing);
    }, { target: selector, duration: ms });
}
const frames = (page: Page) => page.evaluate(() => (window as unknown as { __frames: { scale: number; x: number; y: number; opacity: number; at: number }[] }).__frames);
const settledTransform = (page: Page, name: string) => page.getByRole('dialog', { name }).evaluate(element => {
    const value = getComputedStyle(element).transform;
    if (value === 'none')
        return { scale: 1, x: 0, y: 0 };
    const matrix = new DOMMatrix(value);
    return { scale: matrix.a, x: matrix.e, y: matrix.f };
});
const atRest = (t: { scale: number; x: number; y: number }) => Math.abs(t.scale - 1) < 0.005 && Math.abs(t.x) < 1 && Math.abs(t.y) < 1;
/** "Settles to rest" is a claim about the end of the motion, so it has to be observed at the end.
 * Reading the transform once, immediately after the arrival started, measures the spring's
 * first frames and nothing else: at ~27 ms a panel spring that starts 35 px away is still 2 % off
 * scale. Wait (bounded) for rest, then assert rest at the same strength as before. */
const waitForRest = async (page: Page, name: string) => {
    await expect.poll(async () => atRest(await settledTransform(page, name)), { timeout: 4000 }).toBe(true);
};

test('the empty-Field invitation is decoration: blank double-click still places a thought', async ({ page }) => {
    await page.goto('/?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const invitation = page.locator('[data-decoration="empty-field"]');
    await expect(invitation).toBeVisible();
    // Being decoration is the contract this test protects, rather than any one wording: the
    // invitation is off the accessibility surface, owns no pointer, and states what an empty Field
    // is for in its current eyebrow/line copy.
    await expect(invitation).toHaveAttribute('aria-hidden', 'true');
    await expect(invitation).toContainText('An empty Field');
    await expect(invitation).toContainText('Write down a thought');
    expect(await invitation.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
    expect(await invitation.evaluate(element => getComputedStyle(element).userSelect)).toBe('none');
    const box = await invitation.boundingBox();
    if (!box)
        throw new Error('Invitation has no bounds');
    // Passive copy is present on screen, yet no point of it owns the pointer: the Field does.
    const probes = [[box.x + 4, box.y + 6], [box.x + box.width / 2, box.y + box.height / 2], [box.x + box.width - 4, box.y + box.height - 4]];
    for (const [x, y] of probes)
        expect(await page.evaluate(([px, py]) => document.elementFromPoint(px!, py!)?.closest('[data-decoration]') ? 'decoration' : 'field', [x, y])).toBe('field');
    // Double-clicking the invitation itself is a blank-Field gesture, not a confused focus change.
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    const editor = page.getByRole('textbox', { name: 'Edit thought' });
    await expect(editor).toBeFocused();
    await editor.fill('The first honest thought');
    await editor.press('Enter');
    await expect(page.locator('[data-thought-id]')).toHaveCount(1);
    // The invitation leaves with the empty state instead of lingering over real content.
    await expect(invitation).toHaveCount(0);
    await expect(page.getByTestId('speak')).toHaveCount(0);
});

test('the Field title rests as identity and renames in a composed state', async ({ page }) => {
    await page.goto('/?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    // Never a permanently exposed input.
    await expect(page.getByTestId('field-rename')).toHaveCount(0);
    await expect(page.getByTestId('field-title')).toBeVisible();
    await page.getByTestId('field-title').click();
    await page.getByTestId('field-menu').locator('[data-command="rename-field"]').click();
    const shell = page.getByTestId('field-rename-shell');
    await expect(shell).toBeVisible();
    await expect(shell).toContainText('Enter to save / Escape to cancel');
    const input = page.getByTestId('field-rename');
    await expect(input).toBeFocused();
    // The whole name is selected, so renaming replaces it in one gesture.
    const selection = await input.evaluate(element => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd]);
    expect(selection).toEqual([0, 'Untitled'.length]);
    await input.press('Escape');
    await expect(shell).toHaveCount(0);
    await expect(page.locator('.identity h1')).toHaveText('Untitled');
    await page.getByTestId('field-title').click();
    await page.getByTestId('field-menu').locator('[data-command="rename-field"]').click();
    await page.getByTestId('field-rename').fill('A field with a name');
    await page.getByTestId('field-rename').press('Enter');
    await expect(page.locator('.identity h1')).toHaveText('A field with a name');
    await expect(page.getByTestId('field-rename-shell')).toHaveCount(0);
});

test('Settings is a dedicated centred surface with sections and one close language', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    if (!box)
        throw new Error('Settings has no bounds');
    // A place, not a panel hanging off the top-right corner.
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(24);
    expect(box.width).toBeGreaterThan(600);
    // Four product questions remain; Thinking, Shortcuts and About were retired (the shortcut
    // reference is its own surface and the About facts moved into Help).
    await expect(dialog.locator('.settings-nav button')).toHaveCount(4);
    await expect(dialog.locator('.settings-nav button[aria-selected="true"]')).toHaveText('General');
    // Each section is asserted while it is the active one, so the test proves the section is
    // reachable as well as complete — a hidden panel would satisfy a text assertion on its own.
    // General owns Language and the type/interface controls.
    await expect(dialog.locator('#setting-general')).toContainText('Language');
    await expect(dialog.locator('#setting-general')).toContainText('Thought typography');
    await dialog.locator('.settings-nav button[data-section="ai"]').click();
    // v0.4 Phase 2.8B: the row is the product question ("Provider"), and every real provider — not
    // only the gateway — is a first-class choice here. The gateway is one option among several.
    await expect(dialog.locator('#setting-ai')).toContainText('Provider');
    await expect(dialog.locator('#setting-ai')).toContainText('Off / manual Field only');
     // Search & Evidence is reachable as its own place rather than buried in AI.
    await dialog.locator('.settings-nav button[data-section="search"]').click();
    await expect(dialog.locator('#setting-search')).toContainText('Search & Evidence');
    await expect(dialog.locator('#setting-search')).toContainText('External exploration');
    // The About facts are Help content now, in the same window-level place Settings uses.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.getByTestId('global-more').click();
    await page.getByRole('menuitem', { name: 'Help', exact: true }).click();
    const help = page.getByRole('dialog', { name: 'Help', exact: true });
    await expect(help).toContainText('Saved in this browser, on this device.');
    await expect(help).toBeInViewport();
    // One close affordance for every surface, and it states its own shortcut.
    const close = help.getByRole('button', { name: 'Return to Field', exact: true });
    await expect(close).toContainText('Esc');
    await close.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('global-more')).toBeVisible();
});

test('menu rows reveal their shortcut while staying the accessible command name', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.getByTestId('global-more').click();
    const menu = page.getByTestId('global-menu');
    await expect(menu.locator('[data-command="palette"] kbd')).toHaveText('Ctrl+K');
    await expect(menu.locator('[data-command="find"] kbd')).toHaveText('Ctrl+F');
    await expect(menu.locator('[data-command="settings"] kbd')).toHaveText('Ctrl+,');
    await expect(menu.getByRole('menuitem', { name: 'Command Palette', exact: true })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Help', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
});

test('How did this form reads as a decision timeline, never as internal event ids', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.locator('[data-thought-id="attention"]').dblclick();
    const editor = page.getByRole('textbox', { name: 'Edit thought' });
    await editor.fill('Attention should change clarity, reconsidered');
    await editor.press('Enter');
    await page.getByTestId('field-title').click();
    await page.getByTestId('field-menu').locator('[data-command="more"]').click();
    await page.getByTestId('field-more-menu').locator('[data-command="history"]').click();
    const dialog = page.getByRole('dialog', { name: 'How did this form?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.history-day').first()).toHaveText('Today');
    await expect(dialog.locator('.history-event').first()).toContainText('Reframed');
    await expect(dialog.locator('.history-event').first().locator('time')).toHaveText(/\d{2}:\d{2}/);
    await expect(dialog.locator('.history-chip').first()).toHaveText('Wording');
    // The event id is available as data for diagnosis, and never as the visible subject.
    await expect(dialog.locator('.history-event[data-kind="thought.edit"]')).toHaveCount(1);
    expect(await dialog.locator('.history-events').innerText()).not.toContain('thought.');
    await expect(dialog.locator('.history-scope-item').first()).toContainText('Current thought');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('motion is measured: a dedicated surface arrives transformed and settles to rest', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await sampleFrames(page, '.surface.window', 2000);
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await expect(dialog).toBeVisible();
    await expect.poll(async () => (await frames(page)).length, { timeout: 4000 }).toBeGreaterThan(3);
    const samples = await frames(page);
    // A real arrival: the surface is scaled up and faded in over several frames, not pasted in.
    expect(samples.some(sample => sample.scale < 0.995)).toBe(true);
    expect(samples.some(sample => sample.opacity < 0.99)).toBe(true);
    expect(samples.some(sample => !Number.isFinite(sample.at))).toBe(false);
    await waitForRest(page, 'Field settings');
    const settled = await settledTransform(page, 'Field settings');
    expect(settled.scale).toBeCloseTo(1, 2);
    expect(Math.abs(settled.x)).toBeLessThan(1);
    expect(Math.abs(settled.y)).toBeLessThan(1);
});

test('reduced motion removes the transition instead of hiding it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await expect(dialog).toBeVisible();
    // The same final state, reached without a transition: nothing is hidden, nothing is delayed.
    await expect.poll(async () => (await settledTransform(page, 'Field settings')).scale).toBe(1);
    const state = await settledTransform(page, 'Field settings');
    expect(state.x).toBe(0);
    expect(state.y).toBe(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('creating a Field announces arrival and the reset fades instead of veiling', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
    await page.getByTestId('field-title').click();
    await page.getByTestId('field-menu').locator('[data-command="new-field"]').click();
    await expect(page.getByTestId('field-arrival')).toBeVisible();
    await expect(page.getByTestId('field-arrival-hint')).toContainText('A new Field');
    await expect(page.locator('.identity h1')).toHaveText('Untitled');
    await expect(page.locator('[data-thought-id]')).toHaveCount(0);
    // A new space is still an empty space: the invitation is the first thing offered.
    await expect(page.locator('[data-decoration="empty-field"]')).toBeVisible();
    // The arrival reset is a transition, never a permanent veil over the Field.
    await expect(page.getByTestId('field-arrival')).toHaveCount(0, { timeout: 9000 });
    await page.locator('[data-thought-id], .world').first().click({ position: { x: 900, y: 600 } });
    await expect(page.getByTestId('speak')).toBeVisible();
});
