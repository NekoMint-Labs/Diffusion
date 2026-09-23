import { test, expect, type Browser, type Page } from '@playwright/test';

/** Real computed presentation of the Thought material ladder.
 *
 * Every assertion here reads what the browser actually paints — `getComputedStyle` on rendered
 * `.thought` elements — not source text or exact percentages. The thresholds are relationship
 * assertions with a one-line justification each, so a profile retune that keeps the *ordering* and
 * separation the design promises still passes, while a collapse of two states does not.
 *
 * All measurements are taken in Graphite Night, the profile whose Field and Surface sit closest in
 * tone and therefore leans hardest on the ladder.
 */

interface Appearance { profile: string; background?: string; fieldStyle?: string; image?: Record<string, unknown> }
interface Seed { locale: string; theme: string; provider?: string; appearance: Appearance }

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)?.push(error.message)); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

/** Boot the demo Field in a seeded appearance so the whole capture is of one theme. */
async function boot(browser: Browser, appearance: Appearance, provider = 'off', freezeThoughtTransitions = true) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
    const settings: Seed = { locale: 'en', theme: 'dark', provider, appearance };
    await context.addInitScript(value => { localStorage.setItem('diffusion-settings', JSON.stringify(value)); }, settings);
    const page = await context.newPage();
    await page.goto('/demo?locale=en');
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-style-profile', 'graphite-night');
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
    // Freeze the Thought material transition so a computed colour is always its settled value in a
    // stable serialization (a *transitioning* colour-mix serializes as oklab, a settled one as
    // color(srgb …)); the value measured is identical, only the timing ambiguity is removed.
    if (freezeThoughtTransitions)
        await page.addStyleTag({ content: '.thought { transition: none !important; }' });
    return { context, page };
}

interface Measured { bgAlpha: number; bgRGB: number[]; ringAlpha: number; ringRGB: number[]; boxShadow: string; fieldBg: number[]; bgRaw: string; ringRaw: string }
/** Read the two things a Thought material states: its fill alpha/RGB and the first (inset ring)
 * colour of its box-shadow, plus the Field it composites over. Chromium serializes a resolved
 * `color-mix()` as `color(srgb …)` rather than `rgba(…)`, so both forms are parsed. */
async function readMaterial(page: Page, selector: string): Promise<Measured> {
    return page.locator(selector).first().evaluate((element) => {
        const parse = (value: string): { rgb: number[]; alpha: number } => {
            const legacy = value.match(/rgba?\(([^)]+)\)/);
            if (legacy) {
                const parts = legacy[1].split(',').map(part => Number.parseFloat(part.trim()));
                return { rgb: [parts[0], parts[1], parts[2]], alpha: parts.length > 3 ? parts[3] : 1 };
            }
            const srgb = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
            if (srgb) return { rgb: [Number(srgb[1]), Number(srgb[2]), Number(srgb[3])].map(v => v * 255), alpha: srgb[4] !== undefined ? Number(srgb[4]) : 1 };
            return { rgb: [0, 0, 0], alpha: 1 };
        };
        const style = getComputedStyle(element);
        const background = parse(style.backgroundColor);
        const ringRaw = style.boxShadow.match(/rgba?\([^)]*\)|color\([^)]*\)/)?.[0] ?? '';
        const ring = parse(ringRaw);
        return {
            bgAlpha: background.alpha, bgRGB: background.rgb,
            ringAlpha: ring.alpha, ringRGB: ring.rgb,
            boxShadow: style.boxShadow,
            fieldBg: parse(getComputedStyle(document.body).backgroundColor).rgb,
            bgRaw: style.backgroundColor, ringRaw,
        };
    });
}

const channel = (value: number) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (rgb: number[]) => 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
const contrast = (a: number[], b: number[]) => { const [hi, lo] = luminance(a) >= luminance(b) ? [luminance(a), luminance(b)] : [luminance(b), luminance(a)]; return (hi + 0.05) / (lo + 0.05); };
const over = (fg: number[], alpha: number, bg: number[]) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));
const hexRgb = (value: string) => [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];
const maxChannelDelta = (a: number[], b: number[]) => Math.max(...a.map((c, i) => Math.abs(c - b[i])));

test('Graphite Night draws a real, strictly ordered Thought material ladder', async ({ browser }) => {
    const { context, page } = await boot(browser, { profile: 'graphite-night', background: 'paper' });
    await page.mouse.move(1300, 900);
    await page.waitForTimeout(150);
    const rest = await readMaterial(page, '[data-thought-id="proof"]');
    expect(await page.locator('[data-thought-id="proof"]').getAttribute('data-emphasis')).toBe('normal');

    // One selection states the whole ladder in the real product: the anchor is selected, its
    // confirmed relation is direct, and a geometrically-near neighbour is nearby.
    await page.locator('[data-thought-id="attention"]').click();
    await expect(page.locator('[data-thought-id="attention"]')).toHaveAttribute('data-selected', 'true');
    await expect(page.locator('[data-thought-id="structure"]')).toHaveAttribute('data-emphasis', 'direct');
    await expect(page.locator('[data-thought-id="unfinished"]')).toHaveAttribute('data-emphasis', 'nearby');
    await page.waitForTimeout(450); // motion-control is 200ms; let every state settle before reading.
    const nearby = await readMaterial(page, '[data-thought-id="unfinished"]');
    const direct = await readMaterial(page, '[data-thought-id="structure"]');
    const selected = await readMaterial(page, '[data-thought-id="attention"]');

    console.log(`[measured] bg alpha rest=${rest.bgAlpha.toFixed(3)} nearby=${nearby.bgAlpha.toFixed(3)} direct=${direct.bgAlpha.toFixed(3)} selected=${selected.bgAlpha.toFixed(3)}`);
    console.log(`[measured] ring alpha rest=${rest.ringAlpha.toFixed(3)} nearby=${nearby.ringAlpha.toFixed(3)} direct=${direct.ringAlpha.toFixed(3)} selected=${selected.ringAlpha.toFixed(3)}`);
    console.log(`[measured] rest bg ${rest.bgRaw} | rest ring ${rest.ringRaw}`);

    // (1) A meaningful ladder: both measured channels strictly increase rest < nearby < direct < selected.
    expect(rest.bgAlpha).toBeLessThan(nearby.bgAlpha);
    expect(nearby.bgAlpha).toBeLessThan(direct.bgAlpha);
    expect(direct.bgAlpha).toBeLessThan(selected.bgAlpha);
    expect(rest.ringAlpha).toBeLessThan(nearby.ringAlpha);
    expect(nearby.ringAlpha).toBeLessThan(direct.ringAlpha);
    expect(direct.ringAlpha).toBeLessThan(selected.ringAlpha);

    // (3) Nearby != Direct by more than a rounding error. 3 percentage points of alpha: at Graphite
    // Night's near-black tone a 3/100 fill step over the Field is a clearly perceptible separation
    // (measured 10 points here); sub-pixel/rounding noise is under 1 point.
    expect(direct.bgAlpha - nearby.bgAlpha).toBeGreaterThanOrEqual(0.03);

    // (2) Selected is materially stronger than Rest, in the fill and in a user-visible shadow change.
    expect(selected.bgAlpha - rest.bgAlpha).toBeGreaterThanOrEqual(0.10);
    expect(selected.boxShadow).not.toBe(rest.boxShadow);
    expect(selected.boxShadow).toContain('inset');
    expect(selected.ringAlpha).toBeGreaterThan(rest.ringAlpha);

    // (4) At 100% zoom a resting Thought still reads as an object: its inset boundary ring must not
    // vanish into the Field. Composite the ring colour over the Field and compare relative
    // luminances. 1.10 is the stated floor for a perceptible hairline at these levels; a 1px ring
    // below roughly a 10% luminance step stops separating from near-black graphite.
    const ringOverField = over(rest.ringRGB, rest.ringAlpha, rest.fieldBg);
    const ratio = contrast(ringOverField, rest.fieldBg);
    console.log(`[measured] rest edge over Field ${ringOverField.map(v => v.toFixed(1)).join(',')} vs Field ${rest.fieldBg.map(v => v.toFixed(1)).join(',')} → luminance ratio ${ratio.toFixed(3)}`);
    expect(ratio, 'a resting Thought edge is not invisible against the Field').toBeGreaterThanOrEqual(1.10);

    await context.close();
});

/** Produce a real Ghost through the demo provider and read the canonical and Ghost materials in one
 * background material. Each context is seeded, so no settings interaction is needed mid-test. */
async function ghostAndCanonical(browser: Browser, image: boolean) {
    const source = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADAgH/5ncLrgAAAABJRU5ErkJggg==';
    const atmosphere = image ? { source, presence: 45, saturation: 70, brightness: 90, softness: 35, themeBlend: 50, dirty: false, stats: null } : undefined;
    const { context, page } = await boot(browser, { profile: 'graphite-night', fieldStyle: 'paper-texture', image: atmosphere }, 'demo');
    await expect(page.locator('html')).toHaveAttribute('data-image-atmosphere', image ? 'true' : 'false');
    const input = page.getByRole('textbox', { name: 'Speak', exact: true });
    await input.click();
    await input.fill('Is there something here, but not yet a claim?');
    await input.press('Enter');
    await expect(page.locator('.thought.ghost').first()).toBeVisible();
    await page.mouse.move(1300, 900);
    await page.waitForTimeout(300);
    const canonical = await readMaterial(page, '[data-thought-id="structure"]');
    const ghost = await readMaterial(page, '.thought.ghost');
    const pencil = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--pencil-trace').trim());
    await context.close();
    return { canonical, ghost, pencil };
}

test('Ghost is a different kind of material, and Image Atmosphere fills canonical Thoughts but not Ghosts', async ({ browser }) => {
    const paper = await ghostAndCanonical(browser, false);
    const image = await ghostAndCanonical(browser, true);
    console.log(`[measured] canonical ring ${paper.canonical.ringRGB.map(v => v.toFixed(0)).join(',')} @${paper.canonical.ringAlpha.toFixed(3)} fill ${paper.canonical.bgAlpha.toFixed(3)} raw=[${paper.canonical.bgRaw}] ring=[${paper.canonical.ringRaw}]`);
    console.log(`[measured] ghost ring ${paper.ghost.ringRGB.map(v => v.toFixed(0)).join(',')} @${paper.ghost.ringAlpha.toFixed(3)} fill ${paper.ghost.bgAlpha.toFixed(3)} raw=[${paper.ghost.bgRaw}] ring=[${paper.ghost.ringRaw}] (pencil trace ${paper.pencil})`);
    console.log(`[measured] image canonical fill ${image.canonical.bgAlpha.toFixed(3)} raw=[${image.canonical.bgRaw}]; image ghost fill ${image.ghost.bgAlpha.toFixed(3)} raw=[${image.ghost.bgRaw}]`);
    console.log(`[measured] canonical fill paper=${paper.canonical.bgAlpha.toFixed(3)} image=${image.canonical.bgAlpha.toFixed(3)}; ghost fill paper=${paper.ghost.bgAlpha.toFixed(3)} image=${image.ghost.bgAlpha.toFixed(3)}`);

    // (5) A Ghost differs by kind, not a few percent of opacity: its edge is drawn from the pencil
    // trace, not from a canonical Thought's surface-boundary ring.
    expect(maxChannelDelta(paper.ghost.ringRGB, hexRgb(paper.pencil)), 'the Ghost edge is the pencil trace colour').toBeLessThanOrEqual(2);
    expect(maxChannelDelta(paper.ghost.ringRGB, paper.canonical.ringRGB), 'the Ghost edge is not the canonical boundary ring').toBeGreaterThan(20);
    // …in addition to being fainter than a canonical Thought.
    expect(paper.ghost.bgAlpha).toBeLessThan(paper.canonical.bgAlpha);

    // (7) Image Atmosphere gives a canonical Thought a fuller fill; a Ghost keeps its own treatment.
    expect(image.canonical.bgAlpha).toBeGreaterThan(paper.canonical.bgAlpha);
    expect(image.ghost.bgAlpha).toBeCloseTo(paper.ghost.bgAlpha, 3);
    expect(image.ghost.bgAlpha).toBeLessThan(image.canonical.bgAlpha);
});

async function settleOpacity(page: Page, state: string): Promise<number> {
    const selector = `.causal-trace[data-causal-state="${state}"] .causal-trace-visual`;
    await expect(page.locator(selector)).toHaveCount(1);
    await expect.poll(async () => page.locator(selector).first().evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0);
    await page.waitForTimeout(450); // attention 200ms / spatial 340ms transitions must finish.
    return page.locator(selector).first().evaluate(el => Number(getComputedStyle(el).opacity));
}

test('a causal trace is a distinct presence sleeping, as a parent, and awake', async ({ browser }) => {
    const { context, page } = await boot(browser, { profile: 'graphite-night', background: 'paper' });
    // Build a real causal lineage through the product: crystallize the anchor, then continue from it
    // (the continued Thought carries derivedFrom + generationAction 'continue').
    await page.locator('[data-thought-id="attention"]').click();
    await page.getByTestId('thought-more').click();
    await page.getByTestId('thought-menu').locator('[data-command="crystallize"]').click();
    await page.getByRole('textbox', { name: 'Your wording' }).fill('A chosen commitment');
    await page.getByRole('button', { name: 'Confirm this Crystal' }).click();
    await expect(page.locator('[data-thought-id="attention"]')).toHaveAttribute('data-kind', 'crystal');
    await page.getByTestId('scope-continue').click();
    const editor = page.getByRole('textbox', { name: 'Edit thought' });
    await editor.fill('A new line, not a rewritten commitment');
    await editor.press('Enter');
    await expect(editor).toHaveCount(0);
    const child = page.locator('[data-thought-id]').filter({ has: page.locator('p', { hasText: 'A new line, not a rewritten commitment' }) });
    await expect(child).toHaveCount(1);
    await expect(page.locator('.causal-trace')).toHaveCount(1);

    // wake: the continued Thought's ancestry is selected.
    const wake = await settleOpacity(page, 'wake');
    // sleep: nothing selected and nothing hovered.
    await page.getByTestId('field').click({ position: { x: 80, y: 880 } });
    await page.mouse.move(1300, 900);
    const sleep = await settleOpacity(page, 'sleep');
    // parent: hover the edge's child with no selection.
    await child.hover();
    const parent = await settleOpacity(page, 'parent');

    console.log(`[measured] causal trace opacity sleep=${sleep} parent=${parent} wake=${wake}`);
    // The three states are three distinct presences, not one value with noise.
    expect(sleep).toBeLessThan(parent);
    expect(parent).toBeLessThan(wake);
    expect(parent - sleep).toBeGreaterThanOrEqual(0.05);
    expect(wake - parent).toBeGreaterThanOrEqual(0.05);
    // Sleeping is quiet but not invisible: 0.15 is the floor at which a 1.15px trace still separates
    // from the Field material; the recipe rests at 0.34 (Graphite Night).
    expect(sleep, 'a sleeping trace is still present').toBeGreaterThanOrEqual(0.15);

    await context.close();
});


test('Keep stabilizes a Ghost material in place without generic circular feedback', async ({ browser }) => {
    for (const reduced of [false, true]) {
        const { context, page } = await boot(browser, { profile: 'graphite-night', fieldStyle: 'paper-texture' }, 'demo', false);
        if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
        const input = page.getByRole('textbox', { name: 'Speak', exact: true });
        await input.click();
        await input.fill('Is there something here, but not yet a claim?');
        await input.press('Enter');
        const ghost = page.locator('.thought.ghost').first();
        await expect(ghost).toBeVisible();
        const id = await ghost.getAttribute('data-thought-id');
        const before = await ghost.boundingBox();
        if (!id || !before) throw new Error('Ghost has no stable identity or bounds');
        await ghost.click();
        await page.getByTestId('proposal-keep-all').click();
        const thought = page.locator(`[data-thought-id="${id}"]`);
        await expect(thought).toBeVisible();
        await expect(thought).not.toHaveClass(/ghost/);
        await expect(thought).toHaveAttribute('data-material-settling', 'true');
        const after = await thought.boundingBox();
        if (!after) throw new Error('Kept Thought has no bounds');
        expect(after.x).toBeCloseTo(before.x, 0);
        expect(after.y).toBeCloseTo(before.y, 0);
        await expect(page.getByTestId('settle-activity')).toHaveCount(0);
        const pencil = await thought.evaluate(element => {
            const style = getComputedStyle(element, '::before');
            return { animation: style.animationName, opacity: Number(style.opacity) };
        });
        if (reduced) {
            expect(pencil.animation).toBe('none');
            expect(pencil.opacity).toBe(0);
        } else {
            expect(pencil.animation).toBe('ghost-pencil-settle');
        }
        await expect(thought).not.toHaveAttribute('data-material-settling', 'true');
        await context.close();
    }
});
