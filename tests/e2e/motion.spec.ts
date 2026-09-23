import { test, expect, type Page } from '@playwright/test';

/** Phase 2.6 — the signature sequences, measured in the production bundle.
 *
 * The Phase 2.5 record was honest about its own limit: "motion was judged by no one", because a
 * still frame and a DOM read cannot see travel. This spec narrows that limit without pretending to
 * cross it. It does not judge whether a sequence is *good*; it decides the claims that were only
 * ever asserted in prose:
 *
 *   - the first Thought written in the composer really does travel, and really does come to rest;
 *   - the first Thought placed by a double-click is not a dead path beside it;
 *   - a Field switch really does depart and arrive, rather than swapping between two frames;
 *   - Settings really does hold the Field back while it owns the screen;
 *   - the background really does move inside a few seconds, not inside a minute;
 *   - and under `prefers-reduced-motion: reduce` every one of those keeps its state change and
 *     gives up its travel.
 *
 * The measurement is taken inside the page, on every animation frame, next to the frame the browser
 * is painting — the only place where travel is a fact rather than an intention. `travel` is the
 * extent of the rendered position (transform included), which is deliberately robust to a frame
 * captured before an authored timeline's first tick: such a frame can only shrink a leading edge,
 * never invent movement.
 */

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
    errors.set(page, []);
    page.on('pageerror', error => errors.get(page)?.push(error.message));
    // Keep motion measurements isolated from first-use WebGL shader compilation; renderer behavior
    // is covered by fieldBackgrounds.spec.ts.
    await page.addInitScript(() => localStorage.setItem('diffusion-settings', JSON.stringify({ appearance: { fieldStyle: 'waves' } })));
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

interface Frame {
    t: number;
    x: number;
    y: number;
    opacity: number;
    scale: number;
}
interface Trace {
    /** Per painted frame: rendered position and opacity of the target. */
    frames: Frame[];
    /** Every style write the sequence made on the target, read from the DOM rather than from a
     * painted frame. A double-click commits, focuses an editor and lays out a Field in one burst,
     * and a rAF sampler can miss the whole flight in that burst — measuring the harness, not the
     * product. The write log is complete whatever the frame rate does, so magnitude claims are read
     * from it and "did a person actually see it move" stays a claim about painted frames. */
    writes: { t: number; x: number; y: number; opacity: number; scale: number }[];
}
interface TraceTrigger { selector: string; type: string; clientX: number; clientY: number; button: number }
async function startTrace(page: Page, selector: string, ms: number, trigger?: TraceTrigger): Promise<() => Promise<Trace>> {
    await page.evaluate(({ selector, ms, trigger }: { selector: string; ms: number; trigger?: TraceTrigger }) => {
        const marker = window as unknown as { __traceTicks?: number; __tracePromise?: Promise<Trace> };
        marker.__traceTicks = 0;
        const frames: Frame[] = [];
        const writes: { t: number; x: number; y: number; opacity: number; scale: number }[] = [];
        const read = (element: Element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const matrix = style.transform === 'none' ? null : new DOMMatrix(style.transform);
            return { x: rect.x, y: rect.y, opacity: Number(style.opacity), scale: matrix ? matrix.a : 1, tx: matrix ? matrix.e : 0, ty: matrix ? matrix.f : 0 };
        };
        marker.__tracePromise = new Promise<Trace>(resolve => {
            const start = performance.now();
            const observer = new MutationObserver(records => {
                for (const record of records) {
                    const element = record.target;
                    if (!(element instanceof Element) || !element.matches(selector))
                        continue;
                    const now = read(element);
                    writes.push({ t: performance.now() - start, x: now.tx, y: now.ty, opacity: now.opacity, scale: now.scale });
                }
            });
            observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style'] });
            const step = () => {
                const element = document.querySelector(selector);
                if (element) {
                    const now = read(element);
                    frames.push({ t: performance.now() - start, x: now.x, y: now.y, opacity: now.opacity, scale: now.scale });
                }
                marker.__traceTicks = (marker.__traceTicks ?? 0) + 1;
                if (performance.now() - start < ms)
                    requestAnimationFrame(step);
                else {
                    observer.disconnect();
                    resolve({ frames, writes });
                }
            };
            requestAnimationFrame(step);
        });
        if (trigger) document.querySelector(trigger.selector)?.dispatchEvent(new MouseEvent(trigger.type, {
            bubbles: true, button: trigger.button, clientX: trigger.clientX, clientY: trigger.clientY,
        }));
    }, { selector, ms, trigger });
    await page.waitForFunction(() => ((window as unknown as { __traceTicks?: number }).__traceTicks ?? 0) > 0);
    return () => page.evaluate(() => (window as unknown as { __tracePromise: Promise<Trace> }).__tracePromise);
}
/** What a measurement is worth: how far the sequence actually wrote the element (authored travel,
 * read from every DOM write), how far it was painted moving, when the movement stopped, and how
 * long it then stayed at rest. "Settled" is a claim about the end of the motion, so it is read as
 * "the last moving frame", not "the first still one" — the first still frame is the one before the
 * timeline starts. */
function measure({ frames, writes }: Trace) {
    if (!frames.length)
        return { samples: 0, writes: writes.length, paintedTravelX: 0, paintedTravelY: 0, travelX: 0, travelY: 0, minScale: 1, minOpacity: 1, restScale: 1, restOpacity: 1, settledAtMs: 0, restedForMs: 0 };
    const last = frames[frames.length - 1];
    const xs = frames.map(frame => frame.x);
    const ys = frames.map(frame => frame.y);
    const atRest = (frame: Frame) => Math.abs(frame.y - last.y) < 0.75 && Math.abs(frame.scale - 1) < 0.004;
    const moving = frames.filter(frame => !atRest(frame));
    const settledAt = moving.length ? moving[moving.length - 1].t : 0;
    const writtenY = writes.map(write => write.y);
    const writtenX = writes.map(write => write.x);
    return {
        samples: frames.length,
        writes: writes.length,
        paintedTravelX: Math.max(...xs) - Math.min(...xs),
        paintedTravelY: Math.max(...ys) - Math.min(...ys),
        travelX: writtenX.length ? Math.max(...writtenX) - Math.min(...writtenX) : 0,
        travelY: writtenY.length ? Math.max(...writtenY) - Math.min(...writtenY) : 0,
        minScale: Math.min(...frames.map(frame => frame.scale), ...writes.map(write => write.scale)),
        minOpacity: Math.min(...frames.map(frame => frame.opacity), ...writes.map(write => write.opacity)),
        restScale: last.scale,
        restOpacity: last.opacity,
        settledAtMs: settledAt,
        restedForMs: last.t - settledAt,
    };
}
/** The element a Thought's motion is authored on: its own text element, one level inside
 * `.thought-preview`. A direct-child selector (`article > p`) matches nothing at all in that shape,
 * and a sampler that matches nothing reports zero samples rather than a failed claim — a false pass
 * for every "the travel is gone" assertion and a false failure for every "it travelled" one. */
const thoughtTextSelector = '[data-thought-id] p, [data-thought-id] textarea';
const composerInput = (page: Page) => page.getByRole('textbox', { name: 'Speak', exact: true });
const fieldReady = async (page: Page) => {
    await expect(page.getByTestId('field')).toBeVisible();
    await expect(page.getByTestId('field-background')).toBeVisible();
};

test('the first Thought written in the composer travels into the Field and settles', async ({ page }) => {
    await page.goto('/?locale=en');
    await fieldReady(page);
    const input = composerInput(page);
    await input.click();
    await input.fill('The thing I keep not deciding.');
    const readback = await startTrace(page, thoughtTextSelector, 1300);
    await input.press('Enter');
    const measured = measure(await readback());
    console.log(`[measured] composer -> first Thought: ${JSON.stringify(measured)}`);
    expect(measured.samples, 'the sampler must have caught the flight').toBeGreaterThan(10);
    // The retuned travel: 36–120 px of real separation from the writing surface. Below 36 px the
    // motion is a nudge nobody notices; the clamp lives in `signature.ts`.
    expect(measured.travelY, 'the idea separates from the composer by a visible distance').toBeGreaterThanOrEqual(36);
    expect(measured.paintedTravelY, 'and it is painted moving, not merely written to the DOM').toBeGreaterThanOrEqual(12);
    expect(measured.minScale, 'it changes depth as it separates').toBeLessThan(0.95);
    expect(measured.settledAtMs, 'the movement ends inside the sequence').toBeLessThanOrEqual(1100);
    expect(measured.restedForMs, 'and it is then genuinely at rest, not merely cut off').toBeGreaterThan(100);
    // The Thought is placed, not bounced: the end state is exactly rest.
    expect(measured.restScale).toBeCloseTo(1, 2);
    expect(measured.restOpacity).toBeCloseTo(1, 2);
    await expect(page.locator('[data-thought-id]')).toHaveCount(1);
});

test('the first Thought placed by a double-click establishes itself instead of appearing', async ({ page }) => {
    await page.goto('/?locale=en');
    await fieldReady(page);
    const readback = await startTrace(page, thoughtTextSelector, 800, {
        selector: '[data-testid="field"]', type: 'dblclick', button: 0, clientX: 720, clientY: 420,
    });
    const measured = measure(await readback());
    console.log(`[measured] double-click -> first Thought: ${JSON.stringify(measured)}`);
    expect(measured.writes, 'the observer must have caught the authored placement').toBeGreaterThan(8);
    // Neither creation path may be dead. The placement path is deliberately simpler than the
    // written one — there is no writing surface for the words to come from — but it is not nothing.
    // Magnitude is read from the sequence's own DOM writes: a double-click commits, focuses an
    // editor and lays out a Field in one burst, and a rAF sampler can miss most of the flight in
    // that burst. Mutation-observed DOM writes prove the authored beat; painted frames remain the
    // capture script's job (see `verification/v0.4.3`).
    expect(measured.travelY, 'the Thought establishes itself rather than popping in').toBeGreaterThanOrEqual(16);
    expect(measured.minScale, 'it changes depth as it establishes itself').toBeLessThan(0.97);
    expect(measured.settledAtMs, 'it establishes quickly').toBeLessThanOrEqual(600);
    expect(measured.restScale).toBeCloseTo(1, 2);
    await expect(page.getByRole('textbox', { name: 'Edit thought' })).toBeFocused();
});

test('a Field switch departs and arrives instead of swapping two frames', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    await expect(page.locator('[data-thought-id="attention"]')).toBeVisible();
    await page.getByTestId('field-title').click();
    const menu = page.getByTestId('field-menu');
    await menu.waitFor({ state: 'visible' });
    await menu.locator('[data-command="more"]').click();
    const duplicate = page.getByTestId('field-more-menu').locator('[data-command="duplicate-field"]');
    await duplicate.waitFor({ state: 'visible' });
    // Begin at the action that starts the crossing. Menu navigation is user think/input time, not
    // part of departure + save + arrival, and on a loaded runner it can consume most of the budget.
    const readback = await startTrace(page, '.thought p', 1800);
    await duplicate.click();
    const measured = measure(await readback());
    console.log(`[measured] Field switch: ${JSON.stringify(measured)}`);
    // Departure: the outgoing Thoughts really left — their word elements faded out and drifted.
    expect(measured.minOpacity, 'the current place actually departs').toBeLessThanOrEqual(0.05);
    expect(Math.max(measured.travelX, measured.travelY), 'the departure is a movement, not a fade in place').toBeGreaterThanOrEqual(18);
    // Arrival: the new place settles its Thoughts back to full presence, inside the documented beat.
    expect(measured.restOpacity, 'the new place arrives at full presence').toBeCloseTo(1, 2);
    // Departure (300 ms beat) + the save that a Field switch has to make + the arrival: the whole
    // crossing is inside a second of choreography, and the trace proves it then stayed at rest.
    expect(measured.settledAtMs, 'the arrival completes within the budget').toBeLessThanOrEqual(1600);
    expect(measured.restedForMs, 'and the new place is genuinely at rest afterwards').toBeGreaterThan(100);
    await expect(page.locator('.thought').first()).toBeVisible();
});

test('Settings holds the Field back while it owns the screen, and releases it on close', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    const field = page.locator('.field');
    expect(await field.evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
    // Observe the style writes themselves so the authored 1 → .986 → 1 beat is deterministic even
    // when a loaded browser does not present every intermediate animation frame to a sampler.
    await field.evaluate(element => {
        const styles: string[] = [];
        const observer = new MutationObserver(records => {
            for (const record of records) {
                if (record.oldValue) styles.push(record.oldValue);
                styles.push(element.getAttribute('style') ?? '');
            }
        });
        observer.observe(element, { attributes: true, attributeFilter: ['style'], attributeOldValue: true });
        (window as typeof window & { __settingsFieldBeat?: { styles: string[]; observer: MutationObserver } }).__settingsFieldBeat = { styles, observer };
    });
    const readback = await startTrace(page, '.field', 900);
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await expect(dialog).toBeVisible();
    const measured = measure(await readback());
    console.log(`[measured] Settings arrival: ${JSON.stringify(measured)}`);
    const authoredScale = await field.evaluate(element => {
        const state = (window as typeof window & { __settingsFieldBeat?: { styles: string[]; observer: MutationObserver } }).__settingsFieldBeat;
        state?.observer.disconnect();
        const styles = [...(state?.styles ?? []), element.getAttribute('style') ?? ''];
        const scales = styles.flatMap(style => [...style.matchAll(/scale(?:3d)?\(\s*([\d.]+)/g)].map(match => Number(match[1])));
        return scales.length ? Math.min(...scales) : 1;
    });
    expect(authoredScale, 'the authored Field pull-back runs').toBeLessThan(0.995);
    expect(measured.minOpacity, 'the Field visibly gives way').toBeLessThan(0.95);
    expect(measured.restScale, 'presentation resolves to identity rather than staying scaled').toBeCloseTo(1, 3);
    // The held recede is a state, not a flicker: it is still true while Settings is open.
    await expect.poll(async () => field.evaluate(element => Number(getComputedStyle(element).opacity)), 'the Field stays a step back while the place owns the screen').toBeLessThan(0.95);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => field.evaluate(element => Number(getComputedStyle(element).opacity)), 'the Field returns to full presence').toBe(1);
});

test('the atmosphere is alive within seconds, not within a minute', async ({ page }) => {
    await page.goto('/demo?locale=en');
    await fieldReady(page);
    const declared = await page.locator('.atmosphere').evaluate(element => {
        const style = getComputedStyle(element, '::before');
        return { name: style.animationName, cycle: parseFloat(style.animationDuration) };
    });
    console.log(`[measured] atmosphere: ${JSON.stringify(declared)}`);
    expect(declared.name, 'the illumination layer is the animated one').toBe('atmosphere-drift');
    // The Phase 2.5 cycle was 48 s: a person never sees it. The retuned cycle has to sit inside the
    // band the product is willing to call "alive while you watch".
    expect(declared.cycle).toBeGreaterThanOrEqual(18);
    expect(declared.cycle).toBeLessThanOrEqual(30);
    const moved = await page.locator('.atmosphere').evaluate(element => new Promise<number>(resolve => {
        const start = performance.now();
        const read = () => {
            const matrix = new DOMMatrix(getComputedStyle(element, '::before').transform);
            const distance = Math.hypot(matrix.e, matrix.f);
            if (distance > 1 || performance.now() - start > 3000) resolve(Number(distance.toFixed(2)));
            else requestAnimationFrame(read);
        };
        requestAnimationFrame(read);
    }));
    console.log(`[measured] atmosphere moved ${moved}px within its first seconds`);
    expect(moved, 'the background moves inside the window a person actually watches').toBeGreaterThan(1);
});

test('reduced motion removes the travel and keeps every state change', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?locale=en');
    await fieldReady(page);
    // The same gesture, with the preference honoured: the Thought still arrives, it just arrives.
    const input = composerInput(page);
    await input.click();
    await input.fill('The thing I keep not deciding.');
    const readback = await startTrace(page, thoughtTextSelector, 700);
    await input.press('Enter');
    const measured = measure(await readback());
    console.log(`[measured] first Thought under reduced motion: ${JSON.stringify(measured)}`);
    await expect(page.locator('[data-thought-id]')).toHaveCount(1);
    // A dead trace satisfies every "reduced motion removed the travel" claim vacuously, so the sampler
    // proves it was looking at a real target before any absence is read as an absence of motion.
    expect(measured.samples, 'the sampler must have observed the target').toBeGreaterThan(0);
    expect(measured.travelY, 'reduced motion removes the travel').toBeLessThanOrEqual(2);
    expect(measured.writes, 'and no arrival sequence is built at all: nothing writes to the DOM').toBe(0);
    // The background stops moving, and the material stays.
    expect(await page.locator('.atmosphere').evaluate(element => getComputedStyle(element, '::before').animationName)).toBe('none');
    expect(await page.locator('.atmosphere').evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
    // A place still opens and closes with no travel to wait on.
    await page.keyboard.press('Control+Comma');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Field settings' })).toHaveCount(0);
});
