import { test, expect } from '@playwright/test';

/** The Motion Lab (`src/dev/MotionLab.tsx` at `/dev/motion`) is a development-only design
 * environment: `main.tsx` guards its dynamic import with `import.meta.env.DEV`, so it is
 * tree-shaken out of the production bundle the e2e gate serves.
 *
 * The suite therefore pins its own baseURL to the Vite dev server and refuses to run anywhere the
 * route is not actually the dev index. Against `npm run test:e2e`'s production webServer (or with
 * no dev server at all) every test skips instead of failing, so the lab can rot loudly but can
 * never break the gate.
 */
const DEV_URL = process.env.LAB_URL ?? 'http://127.0.0.1:5199';
test.use({ baseURL: DEV_URL });

const errors: string[] = [];
test.beforeEach(async ({ page, request }) => {
    errors.length = 0;
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
        if (message.type() === 'error')
            errors.push(`console: ${message.text()}`);
    });
    // A production preview answers `/dev/motion` with the shipped index through SPA fallback, so a
    // 200 is not enough: the served document must be the dev one (Vite client + `/src/main.tsx`).
    let live = false;
    try {
        const response = await request.get('/dev/motion');
        const body = response.ok() ? await response.text() : '';
        live = body.includes('/@vite/client') && body.includes('/src/main.tsx');
    }
    catch {
        live = false;
    }
    test.skip(!live, `The dev-only Motion Lab is not served at ${DEV_URL}. Start it with: npx vite --host 127.0.0.1 --port 5199 --strictPort`);
    await page.goto('/dev/motion');
    await expect(page.locator('.lab')).toBeVisible();
});
test.afterEach(() => { expect(errors).toEqual([]); });

test('every scenario mounts and renders its frame, on every variant', async ({ page }) => {
    const items = page.locator('.lab-nav-item');
    const scenarios = await items.count();
    expect(scenarios).toBeGreaterThan(0);
    for (let index = 0; index < scenarios; index += 1) {
        const item = items.nth(index);
        const name = ((await item.locator('span').last().textContent()) ?? '').trim();
        await item.click();
        await expect(item).toHaveAttribute('aria-current', 'true');
        await expect(page.locator('.lab-frame-name')).toHaveText(name);
        const variants = page.locator('.lab-variant-row .lab-toggle');
        const variantCount = await variants.count();
        expect(variantCount).toBeGreaterThan(0);
        for (let variant = 0; variant < variantCount; variant += 1) {
            await variants.nth(variant).click();
            await expect(page.locator('.lab-frame')).toBeVisible();
            await expect(page.locator('.lab-frame-name')).toHaveText(name);
        }
    }
});

/** The frames are only a comparison if the real primitives still mount inside them. These are the
 * pieces that were reworked after the lab was written (Base UI menu/select, floating-ui surface),
 * so they are exercised directly rather than assumed. */
test('the real primitives the frames reuse still mount', async ({ page }) => {
    // CommandMenu, anchored to a trigger.
    await page.locator('.lab-nav-item').filter({ hasText: 'Menu (anchored)' }).click();
    await page.getByRole('button', { name: 'Open anchored menu' }).click();
    const menu = page.getByTestId('global-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'New Thought' })).toBeVisible();
    await menu.getByRole('menuitem', { name: 'New Thought' }).click();
    await expect(menu).toHaveCount(0);
    await expect(page.locator('.lab-frame .lab-readout').filter({ hasText: 'New Thought' })).toBeVisible();

    // CommandMenu, anchored to a pointer (right-click).
    await page.locator('.lab-nav-item').filter({ hasText: 'Context menu' }).click();
    await page.locator('.lab-surface-target').click({ button: 'right' });
    const context = page.getByTestId('thought-menu');
    await expect(context).toBeVisible();
    await expect(context.getByRole('menuitem', { name: 'Find a relation' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(context).toHaveCount(0);

    // Select, the one dropdown.
    await page.locator('.lab-nav-item').filter({ hasText: 'Select' }).click();
    const trigger = page.getByTestId('lab-select');
    await expect(trigger).toContainText('Serif');
    await trigger.click();
    const popup = page.locator('.ui-select-popup');
    await expect(popup).toBeVisible();
    // The lab only proves anything if it still loads the product's own stylesheet (field.css).
    expect(await popup.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    await page.locator('.ui-select-item[data-value="sans"]').click();
    await expect(trigger).toHaveAttribute('data-value', 'sans');

    // Surface, at the depth level the variant names.
    await page.locator('.lab-nav-item').filter({ hasText: 'Dialog' }).click();
    await page.getByRole('button', { name: 'Open split dialog' }).click();
    const dialog = page.getByRole('dialog', { name: 'Session notes' });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Return to Field', exact: true });
    const box = await close.boundingBox();
    // The product's widened close target must be what the lab actually shows.
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(32);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
    await close.click();
    await expect(dialog).toHaveCount(0);
});

/** Every authored sequence is replayable from the lab: the scenario exists and exposes a Replay
 * control in its controls row. The lab now *executes the production sequences* — it renders
 * production-class fixture DOM and drives it with the functions from `signature.ts` through
 * `useSignature` and direct timeline calls — so a replay here is what the product runs. */
test('every authored sequence scenario is reachable and exposes a Replay control', async ({ page }) => {
    const scenarios = [
        'Empty state to first Thought', 'Quiet Composer', 'First Thought', 'Thought creation feedback', 'New Field / Field switch', 'Settings open', 'Settings close',
        'History timeline', 'Feedback', 'Scope enter', 'Scope exit', 'Atmosphere',
    ];
    for (const name of scenarios) {
        const items = page.locator('.lab-nav-item');
        const total = await items.count();
        let index = -1;
        for (let candidate = 0; candidate < total; candidate += 1) {
            const text = ((await items.nth(candidate).locator('span').last().textContent()) ?? '').trim();
            if (text === name) {
                index = candidate;
                break;
            }
        }
        expect(index, `scenario "${name}" should exist`).toBeGreaterThanOrEqual(0);
        await items.nth(index).click();
        await expect(page.locator('.lab-frame-name')).toHaveText(name);
        const replays = page.locator('.lab-controls .lab-play');
        expect(await replays.count(), `scenario "${name}" should expose a Replay control`).toBeGreaterThan(0);
        // Replaying must not unmount the frame.
        await replays.first().click();
        await expect(page.locator('.lab-frame')).toBeVisible();
    }
});

/** The frames use production material and motion owners: Thought creation resolves in place with
 * no circular Field bloom; composer, overflow, Help, and Atmosphere keep their real implementations. */
test('the Phase 2.7 frames render their production material', async ({ page }) => {
    // Thought creation: production placement emergence on the Thought, with no retired Field halo.
    await page.getByRole('button', { name: 'force normal' }).click();
    await page.locator('.lab-nav-item').filter({ hasText: 'Thought creation feedback' }).click();
    const created = page.locator('.lab-frame .thought[data-thought-id]');
    await expect(created).toBeVisible();
    await page.getByRole('button', { name: 'Replay creation' }).click();
    await expect(created).toBeVisible();
    await expect(page.locator('.lab-frame .field-emergence')).toHaveCount(0);

    // Composer idle / focused: the real composerState machine and the real material.
    await page.locator('.lab-nav-item').filter({ hasText: 'Composer idle / focused' }).click();
    await page.locator('.lab-variant-row .lab-toggle').filter({ hasText: 'idle' }).click();
    await expect(page.locator('.lab-frame .speak')).toHaveAttribute('data-state', 'idle');
    await page.locator('.lab-variant-row .lab-toggle').filter({ hasText: 'focused' }).click();
    await expect(page.locator('.lab-frame .speak')).toHaveAttribute('data-state', 'focused');
    await expect(page.locator('.lab-frame .speak-action')).toBeVisible();
    // The shortcut copy is focus-bound: field.css shows it only while the textarea owns focus, so the
    // lab frame must focus the real textarea before the hint is on screen.
    await page.locator('.lab-frame .speak textarea').first().focus();
    await expect(page.locator('.lab-frame .speak-shortcut')).toBeVisible();

    // Composer multiline: past the cap the stylesheet declares, the textarea scrolls — and the cap
    // is the stylesheet's own max-height, not a number copied into the lab.
    await page.locator('.lab-nav-item').filter({ hasText: 'Composer multiline' }).click();
    const overflowing = page.locator('.lab-frame .speak textarea[data-overflowing="true"]');
    await expect(overflowing).toBeVisible();
    const measured = await overflowing.evaluate(element => ({
        height: parseFloat(getComputedStyle(element).height),
        cap: parseFloat(getComputedStyle(element).maxHeight),
    }));
    expect(measured.cap).toBeGreaterThan(0);
    expect(measured.height).toBeCloseTo(measured.cap, 0);

    // Help is the real window-level place, not an anchored panel.
    await page.locator('.lab-nav-item').filter({ hasText: 'Help place' }).click();
    await page.getByRole('button', { name: 'Open Help' }).click();
    const help = page.locator('.surface.window.help-surface');
    await expect(help).toBeVisible();
    await page.getByRole('button', { name: 'Close Help' }).click();
    await expect(help).toHaveCount(0);

    // The atmosphere is lit by the real derivation, so the frame reads as a role, not a swatch.
    await page.locator('.lab-nav-item').filter({ hasText: 'Atmosphere' }).click();
    await expect(page.locator('.lab-frame .lab-readout').first()).toContainText('atmosphereRole()');
});

test('the theme toggle recolours the lab', async ({ page }) => {
    const html = page.locator('html');
    const theme = page.locator('.lab-theme-toggle');
    await expect(html).toHaveAttribute('data-theme', 'light');
    const before = await page.locator('.lab').evaluate(element => getComputedStyle(element).backgroundColor);
    await theme.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(theme).toHaveText('Dark');
    const after = await page.locator('.lab').evaluate(element => getComputedStyle(element).backgroundColor);
    expect(after).not.toBe(before);
});

/** The lab measures the production choreography, so the one thing a reviewer must never do is
 * compare two motion modes unknowingly. The diagnostic reports both the real OS preference and the
 * current preview mode, everywhere, at all times. */
test('the diagnostic reports the real OS preference and the current preview mode', async ({ page }) => {
    const diagnostic = page.getByTestId('motion-diagnostic');
    await expect(diagnostic).toBeVisible();
    const osReduced = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    await expect(diagnostic).toContainText(`OS reduced-motion: ${osReduced}`);
    await expect(diagnostic).toContainText('Preview mode: system');
    await page.getByRole('button', { name: 'force normal' }).click();
    await expect(diagnostic).toContainText('Preview mode: force normal');
    await page.getByRole('button', { name: 'force reduced' }).click();
    await expect(diagnostic).toContainText('Preview mode: force reduced');
});

/** A signature sequence runs the *same* production function in every mode; only the preference
 * decides whether the timeline is built. Reduced motion must still land the state change, and
 * force-normal must still replay the travel. */
test('force reduced lands a signature sequence at its end state; force normal replays it', async ({ page }) => {
    await page.locator('.lab-nav-item').filter({ hasText: 'History timeline' }).click();
    const last = page.locator('.history-event').last();
    const replay = page.getByRole('button', { name: 'Replay history' });

    // force normal: the events stagger in, so the last one is still waiting its turn.
    await page.getByRole('button', { name: 'force normal' }).click();
    await replay.click();
    expect(Number(await last.evaluate(element => getComputedStyle(element).opacity))).toBe(0);

    // force reduced: the sequence is not built, so every event is at its end state at once.
    await page.getByRole('button', { name: 'force reduced' }).click();
    await expect(last).toHaveCSS('opacity', '1', { timeout: 300 });

    // Back to force normal: it replays — the last event is staggered again.
    await page.getByRole('button', { name: 'force normal' }).click();
    await replay.click();
    expect(Number(await last.evaluate(element => getComputedStyle(element).opacity))).toBe(0);
});

/** force normal must also restore *CSS-declared* motion, not only GSAP. On a machine whose OS asks
 * for reduced motion the product's own stylesheet collapses animation; `data-motion-preview`
 * releases that only while previewing normal. The OS preference is emulated so the assertion is the
 * same on every machine rather than assuming the harness's own setting. */
test('force normal restores CSS-declared motion; force reduced collapses it again', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.lab-nav-item').filter({ hasText: 'Atmosphere' }).click();
    const atmosphere = page.locator('.lab-frame .atmosphere').first();
    await expect(atmosphere).toBeVisible();
    const animationName = () => atmosphere.evaluate(element => getComputedStyle(element, '::before').animationName);
    const html = page.locator('html');

    await page.getByRole('button', { name: 'force reduced' }).click();
    await expect(html).toHaveAttribute('data-motion-preview', '');
    expect(await animationName()).toBe('none');

    await page.getByRole('button', { name: 'force normal' }).click();
    await expect(html).toHaveAttribute('data-motion-preview', 'normal');
    expect(await animationName()).toBe('atmosphere-drift');
});
