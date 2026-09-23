import { test, expect, type Browser, type Locator, type Page } from '@playwright/test';
import { choose, openSection } from './selects.ts';
import zlib from 'node:zlib';

/** Phase 2.5 visual acceptance: the falsifiable half of "interaction, motion and atmosphere".
 *
 * Nothing here judges taste. Every assertion is a claim that is objectively true or false about
 * the rendered product: what colour the Field's pixels actually are, whether the atmosphere is
 * cheap and non-interactive, whether the typographic hierarchy really orders as documented,
 * whether the two size axes scale their own material, and whether reduced motion removes travel
 * without removing meaning. Motion itself is not judged — a still or a DOM read cannot see it —
 * and that limit is stated rather than papered over.
 *
 * The pixel checks decode a real PNG from `page.screenshot()` with `node:zlib` and a
 * non-interlaced filter decoder: they read pixels, not `getComputedStyle`. (Reading the computed
 * gradient stops would be a weaker check and is not used here; the decoder is ~40 lines and adds
 * no dependency.)
 */

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

const fieldReady = async (page: Page) => {
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.locator('.atmosphere')).toHaveCount(1);
};
/** A context with one device preference seeded before the app boots, so the whole capture is of
 * the theme under test rather than of a theme change mid-run. */
async function seeded(browser: Browser, theme: 'light' | 'dark', viewport = { width: 1440, height: 960 }, extra: Record<string, unknown> = {}) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await context.addInitScript(settings => localStorage.setItem('diffusion-settings', JSON.stringify(settings)), { locale: 'en', theme, ...extra });
    return { context, page: await context.newPage() };
}

// --- a real PNG pixel reader ---------------------------------------------------------------
// Enough of the format to read what Chromium screenshots: signature, IHDR, IDAT, 8-bit
// truecolour (RGB or RGBA) and non-interlaced. That is exactly what `page.screenshot()` produces.
interface Pixels { width: number; height: number; channels: number; data: Buffer; }
function decodePng(buffer: Buffer): Pixels {
    if (buffer.readUInt32BE(0) !== 0x89504e47)
        throw new Error('not a PNG');
    let position = 8, width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = 0;
    const idat: Buffer[] = [];
    while (position < buffer.length) {
        const length = buffer.readUInt32BE(position); position += 4;
        const type = buffer.toString('ascii', position, position + 4); position += 4;
        const chunk = buffer.subarray(position, position + length); position += length + 4; // skip CRC
        if (type === 'IHDR') { width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4); bitDepth = chunk[8]; colorType = chunk[9]; interlace = chunk[12]; }
        else if (type === 'IDAT') idat.push(chunk);
        else if (type === 'IEND') break;
    }
    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (!channels || bitDepth !== 8 || interlace !== 0)
        throw new Error(`unsupported PNG: colorType ${colorType}, bitDepth ${bitDepth}, interlace ${interlace}`);
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const out = Buffer.alloc(height * stride);
    let read = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[read++];
        const line = raw.subarray(read, read + stride); read += stride;
        const previous = y ? out.subarray((y - 1) * stride, y * stride) : null;
        const current = out.subarray(y * stride, (y + 1) * stride);
        for (let x = 0; x < stride; x++) {
            const a = x >= channels ? current[x - channels] : 0;
            const b = previous ? previous[x] : 0;
            const c = previous && x >= channels ? previous[x - channels] : 0;
            let value = line[x];
            if (filter === 1) value += a;
            else if (filter === 2) value += b;
            else if (filter === 3) value += (a + b) >> 1;
            else if (filter === 4) {
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
            }
            else if (filter !== 0) throw new Error(`unknown PNG filter ${filter}`);
            current[x] = value & 0xff;
        }
    }
    return { width, height, channels, data: out };
}
/** The mean colour of an 8×8 patch: wide enough that the atmosphere's grain averages out, narrow
 * enough that it is still "a point" on the Field. */
function patchMean(image: Pixels, x: number, y: number, size = 8) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y; yy < y + size; yy++) for (let xx = x; xx < x + size; xx++) {
        const i = (yy * image.width + xx) * image.channels;
        r += image.data[i]; g += image.data[i + 1]; b += image.data[i + 2]; n++;
    }
    return { r: r / n, g: g / n, b: b / n };
}
/** Eight widely separated points on the Field's own plane. They all sit above the composer and
 * the invitation and clear of the identity/`···` chrome, so each one is untouched background. */
const FIELD_POINTS: [number, number][] = [[500, 140], [900, 140], [500, 360], [900, 360], [500, 580], [900, 580], [140, 480], [1300, 480]];
const sampleField = async (page: Page) => {
    const image = decodePng(await page.screenshot());
    return FIELD_POINTS.map(([x, y]) => patchMean(image, x, y));
};

// --- measured values reported to the run ------------------------------------------------------
const readRole = (locator: Locator) => locator.evaluate(element => {
    const style = getComputedStyle(element);
    return {
        fontSize: parseFloat(style.fontSize),
        fontWeight: Number(style.fontWeight),
        lineHeight: parseFloat(style.lineHeight),
        letterSpacing: style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing),
    };
});

test('Paper Day is a neutral paper, not a beige sheet', async ({ browser }) => {
    const { context, page } = await seeded(browser, 'light');
    await page.goto('/?locale=en');
    await fieldReady(page);
    const samples = await sampleField(page);
    const meanDelta = samples.reduce((sum, s) => sum + (s.r - s.b), 0) / samples.length;
    const worst = Math.max(...samples.map(s => Math.abs(s.r - s.b)));
    console.log(`[measured] Paper Day: mean R-B ${meanDelta.toFixed(1)}, worst |R-B| ${worst.toFixed(1)} across ${samples.length} points`);
    for (const [index, s] of samples.entries()) {
        // A beige/warm sheet is R > G > B with a large R-B gap (#f0e8d8 is R-B 24). The material
        // must stay inside a small neutral band, so the two claims together exclude a yellow cast.
        expect(Math.abs(s.r - s.b), `point ${index} (${s.r.toFixed(0)},${s.g.toFixed(0)},${s.b.toFixed(0)}) R-B`).toBeLessThanOrEqual(10);
        // Green is never the cast channel: it is not below both other channels.
        expect(s.g, `point ${index} green vs min(R,B)`).toBeGreaterThanOrEqual(Math.min(s.r, s.b));
    }
    expect(Math.abs(meanDelta)).toBeLessThanOrEqual(8);
    await context.close();
});

test('Graphite Night Topography creates restrained structured variation — not a flat plane', async ({ browser }) => {
    const appearance = { profile: 'graphite-night', fieldStyle: 'topography', fieldPresence: 100 };
    const { context, page } = await seeded(browser, 'dark', { width: 1440, height: 960 }, { appearance });
    await page.goto('/?locale=en');
    await fieldReady(page);
    const background = page.getByTestId('field-background');
    await expect(background).toHaveAttribute('data-background-id', 'topography');
    await expect(background.locator('canvas')).toHaveCount(1);
    const samples = await sampleField(page);
    await background.evaluate(element => { (element as HTMLElement).style.visibility = 'hidden'; });
    const withoutBackground = await sampleField(page);
    const luminance = samples.map(s => 0.2126 * s.r + 0.7152 * s.g + 0.0722 * s.b);
    const backgroundDelta = luminance.map((value, index) => Math.abs(value - (0.2126 * withoutBackground[index].r + 0.7152 * withoutBackground[index].g + 0.0722 * withoutBackground[index].b)));
    const backgroundMean = backgroundDelta.reduce((sum, value) => sum + value, 0) / backgroundDelta.length;
    const spread = Math.max(...luminance) - Math.min(...luminance);
    expect(spread, 'luminance variation across the Field').toBeGreaterThan(4);
    expect(spread, 'structured variation remains quiet').toBeLessThan(24);
    expect(backgroundMean, 'Topography changes real Field pixels').toBeGreaterThan(1);
    expect(backgroundMean, 'Topography remains subordinate to content').toBeLessThan(18);
    await context.close();
});

test('production background is inert and manual creation adds no circular Field halo', async ({ browser }) => {
    const appearance = { profile: 'graphite-night', fieldStyle: 'topography' };
    const { context, page } = await seeded(browser, 'dark', { width: 1440, height: 960 }, { appearance });
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    const background = page.getByTestId('field-background');
    await expect(background).toHaveCount(1);
    await expect(background).toHaveAttribute('aria-hidden', 'true');
    await expect(background).toHaveCSS('pointer-events', 'none');
    await expect(background.locator('canvas')).toHaveCount(1);
    await expect(page.locator('.region-field-layer, .region-field, .field-emergence')).toHaveCount(0);
    expect(await page.getByTestId('field').evaluate(element => getComputedStyle(element, '::before').content)).toBe('none');

    await page.getByTestId('field').dblclick({ position: { x: 1000, y: 620 } });
    await expect(page.getByRole('textbox', { name: 'Edit thought' })).toBeVisible();
    await expect(page.locator('.field-emergence')).toHaveCount(0);
    await context.close();
});


test('the atmosphere exists, is decoration, and is a cheap compositor layer', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    const atmosphere = page.locator('.atmosphere');
    await expect(atmosphere).toHaveAttribute('data-atmosphere', 'rest');
    await expect(atmosphere).toHaveAttribute('aria-hidden', 'true');
    const style = await atmosphere.evaluate(element => {
        const own = getComputedStyle(element), before = getComputedStyle(element, '::before'), after = getComputedStyle(element, '::after');
        const grain = element.querySelector('.atmosphere-grain');
        const grainStyle = grain ? getComputedStyle(grain) : null;
        return {
            pointerEvents: own.pointerEvents,
            opacity: Number(own.opacity),
            animation: before.animationName,
            duration: before.animationDuration,
            grainOpacity: grainStyle ? Number(grainStyle.opacity) : 0,
            filters: [own.filter, own.backdropFilter, before.filter, before.backdropFilter, after.filter, after.backdropFilter, grainStyle?.filter ?? '', grainStyle?.backdropFilter ?? ''],
        };
    });
    // Decoration: no pointer ownership anywhere in the layer.
    expect(style.pointerEvents).toBe('none');
    // The material is actually painted: the grain is on, and the one animated element drifts slowly.
    expect(style.grainOpacity).toBeGreaterThan(0);
    expect(style.animation).toBe('atmosphere-drift');
    expect(style.duration).toBe('24s');
    // Cheap: no blur and no backdrop-filter anywhere in the layer — the repository forbids them.
    for (const filter of style.filters)
        expect(filter, 'filter/backdrop-filter in the atmosphere').toBe('none');
});

test('the editorial hierarchy orders as the design documents it, and the role sizes are pinned', async ({ page }) => {
    // The demo provider gives the AI section its own status line and lets a Ghost be produced.
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    const identity = await readRole(page.locator('.identity h1'));
    const eyebrow = await readRole(page.locator('.identity-eyebrow'));
    const thought = await readRole(page.locator('.thought:not(.crystal):not(.ghost)').first());
    const crystal = await readRole(page.locator('.thought.crystal').first());
    // A Ghost is a real user outcome (Demo mode surfaces possibilities): produce one, then read it.
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    const demo = page.getByRole('dialog', { name: 'Field settings' });
    await page.keyboard.press('Control+Comma');
    await expect(demo).toBeVisible();
    await choose(page, 'provider-select', 'demo');
    await page.keyboard.press('Escape');
    await expect(demo).toHaveCount(0);
    await input.click();
    // Demo structure splits on a stated connector; a single-clause submission is committed as the
    // person's own wording instead of becoming a proposal, so the sentence carries one.
    await input.fill('Is there something here, but not yet a claim?');
    await input.press('Enter');
    const ghostLocator = page.locator('.thought.ghost').first();
    await expect(ghostLocator).toBeVisible();
    const ghost = await readRole(ghostLocator);

    await page.keyboard.press('Control+Comma');
    await expect(demo).toBeVisible();
    await openSection(page, 'appearance');
    // Every read is scoped to the section it belongs to. The panel swap is a crossfade, so for a
    // frame or two the outgoing panel is still in the DOM: an unscoped `.first()` can resolve to a
    // node that is being unmounted, and a detached node has no computed font size to report.
    const uiTitle = await readRole(page.locator('.surface-header h2').first());
    const sectionTitle = await readRole(page.locator('#setting-appearance > h3'));
    const label = await readRole(page.locator('#setting-appearance .ui-setting-label').first());
    await openSection(page, 'ai');
    const helper = await readRole(page.locator('#setting-ai .settings-note').first());
    const status = await readRole(page.locator('#setting-ai .status-line').first());
    // The shortcut reference moved out of Settings into its own surface. Its two typographic roles
    // — a small tracked group heading and a hint kbd — are read where they now render: the palette.
    await page.keyboard.press('Escape');
    await expect(demo).toHaveCount(0);
    await page.keyboard.press('Control+K');
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible();
    const metadata = await readRole(palette.locator('.command-palette-heading').first());
    const hint = await readRole(palette.locator('.command-palette-list kbd').first());
    await page.keyboard.press('Escape');

    const roles = { identity, eyebrow, thought, crystal, ghost, uiTitle, sectionTitle, label, helper, metadata, hint, status };
    console.log('[measured] role metrics', JSON.stringify(Object.fromEntries(Object.entries(roles).map(([name, r]) => [name, `${r.fontSize}px / ${r.fontWeight} / lh ${r.lineHeight || 'normal'} / ls ${r.letterSpacing}`]))));

    // Pinned role sizes: what the design decided at 100 % interface size.
    const pinned: Record<keyof typeof roles, number> = { identity: 18, eyebrow: 10, thought: 18, crystal: 20, ghost: 18, uiTitle: 17, sectionTitle: 13, label: 12, helper: 11, metadata: 10, hint: 10, status: 11.5 };
    for (const [name, size] of Object.entries(pinned))
        expect(roles[name as keyof typeof roles].fontSize, `${name} size`).toBe(size);

    // The ordering relationships the hierarchy promises.
    expect(eyebrow.fontSize, 'eyebrow < identity').toBeLessThan(identity.fontSize);
    // The Stage B/G redesign raised the Field's own identity from utility-label scale to an editorial
    // page identity, so it is no longer subordinate to a surface title inside a place.
    expect(uiTitle.fontSize, 'ui-title ≤ identity').toBeLessThanOrEqual(identity.fontSize);
    expect(helper.fontSize, 'helper ≤ label').toBeLessThanOrEqual(label.fontSize);
    expect(label.fontSize, 'label < section-title').toBeLessThan(sectionTitle.fontSize);
    expect(crystal.fontSize, 'crystal > thought').toBeGreaterThan(thought.fontSize);
    expect(ghost.fontSize, 'ghost == thought').toBe(thought.fontSize);
    expect(crystal.fontWeight, 'crystal weight > thought weight').toBeGreaterThan(thought.fontWeight);
    expect(sectionTitle.fontWeight, 'section-title weight > label weight').toBeGreaterThan(label.fontWeight);
    // Tracking: the eyebrow is the widest-spaced role; the identity is tightened, not spaced.
    expect(eyebrow.letterSpacing, 'eyebrow tracking').toBeGreaterThanOrEqual(1);
    expect(eyebrow.letterSpacing, 'eyebrow tracking > identity tracking').toBeGreaterThan(identity.letterSpacing);
    expect(identity.letterSpacing, 'identity is tightened').toBeLessThanOrEqual(0);
    expect(metadata.letterSpacing, 'metadata tracking > hint tracking').toBeGreaterThan(hint.letterSpacing);
});

test('the two size axes scale their own material only, and both persist', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    const chrome = page.locator('.settings-nav-tab').first();
    const thought = page.locator('[data-thought-id="attention"]');
    const thoughtBefore = await readRole(thought);
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await expect(dialog).toBeVisible();
    await openSection(page, 'appearance');
    const chromeBase = (await readRole(chrome)).fontSize;
    expect(chromeBase, 'chrome base at 100 %').toBe(12);

    await choose(page, 'interface-size-select', '120');
    await expect(page.locator('html')).toHaveAttribute('data-interface-size', '120');
    await expect.poll(async () => (await readRole(chrome)).fontSize, 'chrome scales at 120 %').toBe(14.4);
    // Interface size is the chrome only: the Thought is untouched.
    expect((await readRole(thought)).fontSize, 'thought unaffected by interface size').toBe(thoughtBefore.fontSize);

    const chromeAt120 = (await readRole(chrome)).fontSize;
    await choose(page, 'thought-size-select', '24');
    await expect(page.locator('html')).toHaveAttribute('data-thought-size', '24');
    // Thought size is what the person wrote: the Thought grows, the chrome does not.
    await expect.poll(async () => (await readRole(thought)).fontSize, 'thought scales').toBe(24);
    expect((await readRole(chrome)).fontSize, 'chrome unaffected by thought size').toBe(chromeAt120);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    // Both are device preferences, so they survive a reload.
    await page.reload();
    await fieldReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-interface-size', '120');
    await expect(page.locator('html')).toHaveAttribute('data-thought-size', '24');
    await expect.poll(async () => (await readRole(thought)).fontSize).toBe(24);
});

test('the composer expansion is real geometry, not a painted state', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    const speak = page.getByTestId('speak');
    await expect(speak).toHaveAttribute('data-state', 'idle');
    const idle = await speak.boundingBox();
    if (!idle)
        throw new Error('the idle composer has no bounds');
    await page.getByRole('textbox', { name: 'Speak', exact: true }).focus();
    await expect(speak).toHaveAttribute('data-state', 'focused');
    // The layout animation owns the arrival, so wait for the target width, not for "wider".
    await expect.poll(async () => (await speak.boundingBox())?.width ?? 0, 'focused width settles').toBeGreaterThan(479);
    const focused = await speak.boundingBox();
    if (!focused)
        throw new Error('the focused composer has no bounds');
    console.log(`[measured] composer idle ${idle.width}×${idle.height}, focused ${focused.width}×${focused.height}`);
    expect(focused.width, 'focused is wider').toBeGreaterThan(idle.width);
    expect(focused.height, 'focused is taller').toBeGreaterThan(idle.height);
    // The documented geometry, so a silent regression to a 250 px "chat box" is caught.
    expect(idle.width).toBe(250);
    expect(focused.width).toBeCloseTo(480, 0);
});

test('attention does not hide the rest of the Field: a distant Thought keeps its presence', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    // Zoom one step out (still the readable 'neighborhood' tier) so a genuinely distant place can
    // exist inside the viewport, then place one there — a real user gesture, not a fixture.
    for (let step = 0; step < 3; step++) {
        await page.mouse.move(700, 480);
        await page.mouse.wheel(0, 120);
    }
    await expect(page.getByTestId('field')).toHaveAttribute('data-level', 'neighborhood');
    await page.getByTestId('field').dblclick({ position: { x: 1400, y: 900 } });
    const editor = page.getByRole('textbox', { name: 'Edit thought' });
    await editor.fill('A far reference point');
    await editor.press('Enter');
    const far = page.locator('[data-thought-id]').filter({ has: page.locator('p', { hasText: 'A far reference point' }) });
    await expect(far).toBeVisible();
    const farId = await far.getAttribute('data-thought-id');

    const anchors = page.locator(`[data-kind="thought"]:visible:not([data-thought-id="${farId}"])`);
    await expect.poll(() => anchors.count()).toBeGreaterThanOrEqual(2);
    await anchors.nth(0).click();
    await anchors.nth(1).click({ modifiers: ['Shift'] });
    await page.getByTestId('scope-question').click();
    await expect(page.getByTestId('field')).toHaveAttribute('data-scope', 'true');
    await expect.poll(async () => far.getAttribute('data-emphasis'), 'the far Thought is peripheral').toBe('peripheral');
    // The emphasis attribute flips before the 200 ms ink transition finishes. The Thought body stays
    // fully present; only its content recedes.
    const farInk = far.locator('.thought-preview');
    await expect.poll(async () => farInk.evaluate(element => Number(getComputedStyle(element).opacity)), 'the far Thought settles to its peripheral ink presence').toBeLessThanOrEqual(0.46);
    await expect.poll(async () => far.evaluate(element => Number(getComputedStyle(element).opacity)), 'the far Thought body remains present').toBe(1);

    const presence = await page.locator('[data-thought-id]').evaluateAll(elements => elements.map(element => ({
        id: element.getAttribute('data-thought-id'),
        selected: element.getAttribute('data-selected') === 'true',
        emphasis: element.getAttribute('data-emphasis'),
        objectOpacity: Number(getComputedStyle(element).opacity),
        inkOpacity: Number(getComputedStyle(element.querySelector('.thought-preview')!).opacity),
    })));
    const nonSelected = presence.filter(entry => !entry.selected);
    const inkFloor = Math.min(...nonSelected.map(entry => entry.inkOpacity));
    const farEntry = presence.find(entry => entry.id === farId);
    console.log(`[measured] presence with 2 selected: ${JSON.stringify(presence)}`);
    // Attention changes clarity, not physical existence: every body remains present while the
    // peripheral ink reaches the documented scoped step.
    expect(nonSelected.every(entry => entry.objectOpacity === 1)).toBe(true);
    expect(inkFloor, 'the least-present non-selected Thought ink').toBeGreaterThanOrEqual(0.4);
    expect(farEntry?.inkOpacity ?? 0).toBeGreaterThanOrEqual(0.4);
    expect(farEntry?.inkOpacity ?? 0).toBeLessThanOrEqual(0.46);
    expect(nonSelected.length, 'other Thoughts are still present').toBeGreaterThanOrEqual(3);
});

test('reduced motion removes travel, not meaning', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    const atmosphere = page.locator('.atmosphere');
    await expect(atmosphere).toHaveAttribute('data-atmosphere', 'rest');
    // The drift is off without erasing the stored recommendation.
    await expect.poll(async () => atmosphere.evaluate(element => getComputedStyle(element, '::before').animationName)).toBe('none');
    await expect(page.locator('html')).toHaveAttribute('data-ambient-motion', '50');
    await expect(page.locator('html')).toHaveAttribute('data-field-motion', 'off');
    await expect(page.getByTestId('field-background')).toHaveAttribute('data-motion', '0');
    // ...but the material stays: removing travel is not removing the Field.
    expect(await atmosphere.evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
    expect(await page.locator('.atmosphere-grain').evaluate(element => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0);

    // A state change still reaches its correct end state with no travel to wait on.
    const speak = page.getByTestId('speak');
    await expect(speak).toHaveAttribute('data-state', 'idle');
    await page.getByRole('textbox', { name: 'Speak', exact: true }).focus();
    await expect(speak).toHaveAttribute('data-state', 'focused');
    await expect.poll(async () => (await speak.boundingBox())?.width ?? 0, 'focused width').toBeGreaterThan(479);
    await page.getByRole('textbox', { name: 'Speak', exact: true }).press('Escape');
    await expect(speak).toHaveAttribute('data-state', 'idle');

    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await page.locator('[data-thought-id="attention"]').click();
    await expect(page.locator('[data-thought-id="attention"]')).toHaveAttribute('data-selected', 'true');
    await expect(page.getByTestId('scope-hub')).toBeVisible();
});
