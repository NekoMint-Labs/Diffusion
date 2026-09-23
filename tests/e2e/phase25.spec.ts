import { test, expect, type Page } from '@playwright/test';
import { choose, openSection } from './selects.ts';

/** Phase 2.5's new behaviour, asserted in the real application rather than in the source.
 *
 * These are the claims the phase is actually about: a shortcut override is one effective value
 * shared by the keyboard, the menus and Settings; a conflict is refused and stated; the AI
 * section discloses only what the chosen mode needs; the two size axes persist and the Field
 * re-measures; the composer names its own state; and the Field has a material that stops moving
 * when the user asks it to. */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

const settings = (page: Page) => page.getByRole('dialog', { name: 'Field settings' });
async function openSettings(page: Page, path = '/demo?locale=en') {
    await page.goto(path);
    await expect(page.getByTestId('field')).toBeVisible();
    await page.keyboard.press('Control+Comma');
    await expect(settings(page)).toBeVisible();
}
/** Shortcut overrides are gone: a shortcut now has one effective source, the canonical registry, so
 * only registry composition (rendering the right shortcut for the right platform) is asserted here. */
test('the registry composes a platform shortcut and the menu renders it', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await page.getByTestId('global-more').click();
    const menu = page.getByTestId('global-menu');
    await expect(menu.locator('[data-command="palette"] kbd')).toHaveText('Ctrl+K');
    await expect(menu.locator('[data-command="find"] kbd')).toHaveText('Ctrl+F');
    await page.keyboard.press('Escape');
    // The router uses the registry default directly, with no per-device override in the path.
    await page.keyboard.press('Control+K');
    await expect(page.locator('#command-palette-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#command-palette-input')).toHaveCount(0);
});

test('the AI section discloses only what the chosen provider needs', async ({ page }) => {
    // The only gateway this suite has is one that is not running, so asking it is a local failure
    // rather than a real network wait.
    await page.route('http://127.0.0.1:1/**', route => route.abort());
    await openSettings(page);
    await openSection(page, 'ai');
    const ai = settings(page).locator('#setting-ai');
    // Off: the explanation and nothing else. No credential, no model, no depth.
    await expect(ai).toContainText('Off / manual Field only');
    await expect(ai).toContainText('Thinking is off. The Field stays manual');
    await expect(ai.locator('[data-testid="depth-select"]')).toHaveCount(0);
    await expect(ai.locator('[data-testid="model-select"]')).toHaveCount(0);
    await expect(ai.locator('[data-testid="model-input"]')).toHaveCount(0);
    await expect(ai.locator('input[type="password"]')).toHaveCount(0);
    await expect(ai.locator('[data-testid="ai-status"]')).toHaveAttribute('data-tone', 'unconfigured');
    // Demo: the deterministic explanation, still no model, no depth and no credential.
    await choose(page, 'provider-select', 'demo');
    await expect(ai).toContainText('Demo mode answers with authored example text');
    await expect(ai.locator('[data-testid="depth-select"]')).toHaveCount(0);
    await expect(ai.locator('[data-testid="model-input"]')).toHaveCount(0);
    await expect(ai.locator('input[type="password"]')).toHaveCount(0);
    await expect(ai.locator('[data-testid="ai-status"]')).toHaveAttribute('data-tone', 'limited');
    // Gateway: a credential field, a depth control and a deliberate Test connection — but with no
    // address it claims nothing, and it does not report a capability it never asked for.
    await choose(page, 'provider-select', 'gateway');
    await expect(ai.locator('input[type="password"]')).toHaveCount(1);
    await expect(ai.locator('[data-testid="depth-select"]')).toHaveCount(1);
    await expect(ai.locator('[data-testid="gateway-capability"]')).toHaveCount(0);
    await expect(ai.locator('[data-testid="ai-status"]')).toHaveAttribute('data-tone', 'unconfigured');
    await expect(ai.locator('[data-testid="ai-status"]')).toContainText('Not configured');
    // A gateway that cannot be reached is reported as a failure with a retry affordance — never as
    // "Connected" — and it only ever reports its capability after it has actually answered.
    await ai.locator('[data-testid="gateway-url"]').fill('http://127.0.0.1:1');
    await expect(ai.locator('[data-testid="gateway-url"]')).toHaveValue('http://127.0.0.1:1');
    await ai.locator('[data-testid="test-connection"]').click();
    await expect(ai.locator('[data-testid="ai-status"]')).toHaveAttribute('data-tone', 'error');
    await expect(ai.locator('[data-testid="ai-status"]')).toContainText('Failed');
    await expect(ai.locator('[data-testid="ai-status"]')).not.toContainText(/Connected|Ready/);
    await expect(ai.locator('[data-testid="test-connection"]')).toBeVisible();
    await expect(ai.locator('[data-testid="gateway-capability"]')).toHaveCount(0);
});

test('the two size axes persist, and the Field re-measures after a Thought size change', async ({ page }) => {
    await openSettings(page);
    await openSection(page, 'appearance');
    const nav = settings(page).locator('.settings-nav-tab').first();
    const baseNav = parseFloat(await nav.evaluate(element => getComputedStyle(element).fontSize));
    await choose(page, 'interface-size-select', '120');
    await expect(page.locator('html')).toHaveAttribute('data-interface-size', '120');
    await expect.poll(async () => parseFloat(await nav.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThan(baseNav);
    await choose(page, 'thought-size-select', '24');
    await expect(page.locator('html')).toHaveAttribute('data-thought-size', '24');
    await page.keyboard.press('Escape');
    await expect(settings(page)).toHaveCount(0);
    const thought = page.locator('[data-thought-id="attention"]');
    await expect.poll(async () => parseFloat(await thought.evaluate(element => getComputedStyle(element).fontSize))).toBe(24);
    const box = await thought.boundingBox();
    if (!box)
        throw new Error('The Thought has no bounds after resizing');
    // The element really is bigger, so the geometry cache had something to re-measure.
    expect(box.height).toBeGreaterThan(40);
    // The spatial index still resolves the point after the closing Settings surface releases input.
    await expect.poll(async () => page.evaluate(({ x, y }) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-thought-id]')?.dataset.thoughtId, { x: box.x + box.width / 2, y: box.y + box.height / 2 })).toBe('attention');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(thought).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('scope-hub')).toBeVisible();
    // Both axes are device preferences and survive a reload.
    await page.reload();
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-thought-size', '24');
    await expect.poll(async () => parseFloat(await page.locator('[data-thought-id="attention"]').evaluate(element => getComputedStyle(element).fontSize))).toBe(24);
});

test('the composer names its own state, and its scope line states what thinking will act on', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const speak = page.getByTestId('speak');
    await expect(speak).toHaveAttribute('data-state', 'idle');
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.focus();
    await expect(speak).toHaveAttribute('data-state', 'focused');
    const focused = await speak.boundingBox();
    if (!focused) throw new Error('focused composer has no bounds');
    const shortcut = speak.locator('.speak-shortcut');
    await expect(shortcut).toBeVisible();
    expect(await shortcut.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
    expect((await shortcut.textContent()) ?? '').toBe('Shift+EnterNew line');
    await input.fill('Is this the relation?');
    await expect(speak).toHaveAttribute('data-state', 'writing');
    // Leaving preserves the draft — an unsent intent is never thrown away — so the surface is
    // cleared deliberately here, the way a person does, before the scope is changed.
    await input.fill('');
    await expect(speak).toHaveAttribute('data-state', 'focused');
    await input.press('Escape');
    await expect(speak).toHaveAttribute('data-state', 'idle');
    // A selection defines the scope, and the composer says so in words rather than by an id.
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    // Writing your own question is explicit under More; the primary question action belongs to AI generation.
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="ask"]').click();
    await expect(page.getByTestId('speak')).toHaveAttribute('data-state', 'scoped');
    await expect(page.getByTestId('speak-scope')).toHaveText('Thinking with 2 thoughts');
    // The cue follows the textarea focus, so returning to a scoped composer still presents the
    // newline affordance in its one writing row.
    await expect(page.getByTestId('speak').locator('.speak-shortcut')).toBeVisible();
    await expect(page.getByTestId('field')).toHaveAttribute('data-scope', 'true');
    // The Field carries the scope as an atmosphere, never as a permanent inspector.
    await expect(page.getByTestId('scope-hub')).toHaveCount(0);
});

test('the Field has a material, and reduced motion stops it', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    const atmosphere = page.locator('.atmosphere');
    await expect(atmosphere).toHaveAttribute('data-atmosphere', 'rest');
    // It is decoration: it owns no pointer and no text selection.
    expect(await atmosphere.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
    expect(await atmosphere.evaluate(element => getComputedStyle(element, '::before').animationName)).toBe('atmosphere-drift');
    expect(await atmosphere.evaluate(element => getComputedStyle(element, '::before').animationDuration)).toBe('24s');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(async () => atmosphere.evaluate(element => getComputedStyle(element, '::before').animationName)).toBe('none');
    // The material itself is still there: reduced motion removes travel, not the Field.
    expect(await atmosphere.evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
});
