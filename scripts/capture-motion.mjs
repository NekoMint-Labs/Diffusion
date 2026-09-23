#!/usr/bin/env node
/**
 * Phase 2.6 motion evidence — real production actions, recorded and measured.
 *
 * The Phase 2.5 record said plainly that motion was judged by no one, and that a still frame or a
 * DOM read cannot decide whether travel, easing and choreography are perceptible. This script does
 * not claim to judge taste either. What it removes is the excuse: for every signature sequence it
 * performs the *production* gesture, records a short video of the real page, captures a frame
 * sequence, and samples the animated element on every animation frame so travel, depth and settle
 * are numbers rather than adjectives.
 *
 * Every sequence is captured twice — once with the browser's ordinary motion, once under
 * `prefers-reduced-motion: reduce` — because the real Windows host reports `reduce`, and a review
 * that does not know which mode it is looking at is worthless.
 *
 * It is a capture, not a test: it asserts nothing, produces artefacts, and must be re-runnable
 * against any running preview on its own port so it never collides with the e2e gate.
 *
 * Usage:
 *   npx vite preview --port 4188 --strictPort --host 127.0.0.1     # in another shell
 *   node scripts/capture-motion.mjs
 *
 * Environment:
 *   MOTION_BASE_URL  default http://127.0.0.1:4188
 *   MOTION_OUT       default verification/v0.4.3
 *   MOTION_ONLY      comma-separated sequence names (or `atmosphere`), to re-shoot one of them
 *   MOTION_NO_VIDEO  set to skip video recording (frames and numbers only)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { decodePng, frameDelta, patchMean, regionStats } from './lib/png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.MOTION_BASE_URL ?? 'http://127.0.0.1:4188';
const OUT = path.resolve(ROOT, process.env.MOTION_OUT ?? 'verification/v0.4.3');
const VIEWPORT = { width: 1440, height: 960 };
const MODES = [
    { id: 'normal', media: 'no-preference', label: 'ordinary motion (no OS preference against it)' },
    { id: 'reduce', media: 'reduce', label: 'prefers-reduced-motion: reduce (what the Windows host reports)' },
];
const full = { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height };

/* --- the sequences ---------------------------------------------------------------------------- */

const SEQUENCES = [
    {
        name: 'composer-focus',
        what: 'idle composer -> focused writing surface: the material emerges out of the Field',
        trace: { selector: '.speak-shell', ms: 800 },
        frames: [0, 70, 150, 260, 430],
        clip: { x: 300, y: 700, width: 840, height: 230 },
        setup: async page => { await page.goto(`${BASE}/demo?locale=en`); await ready(page); },
        act: async page => { await page.getByRole('textbox', { name: 'Speak', exact: true }).focus(); },
    },
    {
        name: 'first-thought-composer',
        what: 'first Thought of an empty Field, written in the composer: the surface yields, the idea travels into the Field',
        trace: { selector: '[data-thought-id] p, [data-thought-id] textarea', ms: 1400 },
        frames: [0, 120, 240, 420, 760],
        clip: { x: 320, y: 240, width: 880, height: 660 },
        setup: async page => {
            await page.goto(`${BASE}/?locale=en`);
            await ready(page);
            const input = page.getByRole('textbox', { name: 'Speak', exact: true });
            await input.click();
            await input.fill('The thing I keep not deciding.');
        },
        act: async page => { await page.getByRole('textbox', { name: 'Speak', exact: true }).press('Enter'); },
    },
    {
        name: 'first-thought-placement',
        what: 'first Thought of an empty Field placed by a blank double-click: the editor establishes itself where the gesture happened',
        trace: { selector: '[data-thought-id] p, [data-thought-id] textarea', ms: 900 },
        frames: [0, 90, 190, 330, 520],
        clip: { x: 420, y: 260, width: 660, height: 340 },
        setup: async page => { await page.goto(`${BASE}/?locale=en`); await ready(page); },
        act: async page => { await page.mouse.dblclick(720, 420); },
    },
    {
        name: 'field-switch',
        what: 'Field switch: the current place departs, the new place arrives (a duplicated Field, so the arrival has Thoughts to bring in)',
        trace: { selector: '.thought > p', ms: 1800 },
        frames: [0, 150, 400, 800, 1300],
        clip: full,
        setup: async page => { await page.goto(`${BASE}/demo?locale=en`); await ready(page); await page.locator('[data-thought-id="attention"]').waitFor({ state: 'visible' }); },
        act: async page => { await fieldMenu(page, 'duplicate-field'); },
    },
    {
        name: 'settings-open',
        what: 'Settings arriving: the Field takes its held step back while the place settles in two beats',
        trace: { selector: '.field', ms: 900 },
        frames: [0, 90, 200, 360, 560],
        clip: full,
        setup: async page => { await page.goto(`${BASE}/demo?locale=en`); await ready(page); },
        act: async page => { await page.keyboard.press('Control+Comma'); },
    },
    {
        name: 'settings-close',
        what: 'Settings closing: the Field returns to full presence',
        trace: { selector: '.field', ms: 900 },
        frames: [0, 90, 200, 360, 560],
        clip: full,
        setup: async page => {
            await page.goto(`${BASE}/demo?locale=en`);
            await ready(page);
            await page.keyboard.press('Control+Comma');
            await page.getByRole('dialog', { name: 'Field settings' }).waitFor({ state: 'visible' });
            await page.waitForTimeout(500);
        },
        act: async page => { await page.keyboard.press('Escape'); },
    },
];

/* --- helpers ---------------------------------------------------------------------------------- */

async function ready(page) {
    await page.locator('[data-testid="field"]').waitFor({ state: 'visible' });
    await page.locator('.atmosphere').waitFor({ state: 'attached' });
}

/** Samples one element on every animation frame, inside the page: the only honest way to measure
 * travel is next to the frame the browser is actually painting. The promise is started *before* the
 * gesture and awaited after it. */
function sample(page, selector, ms) {
    return page.evaluate(([selector, ms]) => new Promise(resolve => {
        const series = [];
        const start = performance.now();
        const read = () => {
            const element = document.querySelector(selector);
            if (element) {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                const matrix = style.transform === 'none' ? null : new DOMMatrix(style.transform);
                series.push({
                    t: Number((performance.now() - start).toFixed(1)),
                    x: Number(rect.x.toFixed(2)), y: Number(rect.y.toFixed(2)),
                    width: Number(rect.width.toFixed(2)), height: Number(rect.height.toFixed(2)),
                    opacity: Number(Number(style.opacity).toFixed(3)),
                    scale: matrix ? Number(matrix.a.toFixed(4)) : 1,
                    offsetX: matrix ? Number(matrix.e.toFixed(2)) : 0,
                    offsetY: matrix ? Number(matrix.f.toFixed(2)) : 0,
                });
            }
            if (performance.now() - start < ms)
                requestAnimationFrame(read);
            else
                resolve(series);
        };
        requestAnimationFrame(read);
    }), [selector, ms]);
}

/** What a series is worth: how far the element visibly moved (rendered position, which includes
 * any transform), how much deeper or shallower it got, and when the movement stopped.
 *
 * "Settled" is the **last moving frame**, not the first still one. The trace starts before the
 * gesture, so the first frame at rest is simply the state the page was in beforehand — reading it
 * that way reported a 13 ms settle for a 340 ms transition. The gated `tests/e2e/motion.spec.ts`
 * measures the same quantity the same way, so the two tools agree. */
function summarise(series) {
    if (!series.length)
        return { samples: 0, note: 'the traced element never appeared' };
    const last = series[series.length - 1];
    const travelX = Math.max(...series.map(entry => Math.abs(entry.x - last.x)));
    const travelY = Math.max(...series.map(entry => Math.abs(entry.y - last.y)));
    const scales = series.map(entry => entry.scale);
    const opacities = series.map(entry => entry.opacity);
    const atRest = entry => Math.abs(entry.y - last.y) < 0.75 && Math.abs(entry.scale - 1) < 0.004;
    const moving = series.filter(entry => !atRest(entry));
    const settledAt = moving.length ? moving[moving.length - 1].t : 0;
    return {
        samples: series.length,
        rest: { x: last.x, y: last.y, width: last.width, height: last.height, opacity: last.opacity, scale: last.scale },
        first: { x: series[0].x, y: series[0].y, opacity: series[0].opacity, scale: series[0].scale },
        travel: { x: Number(travelX.toFixed(1)), y: Number(travelY.toFixed(1)) },
        depth: { minScale: Number(Math.min(...scales).toFixed(4)), maxScale: Number(Math.max(...scales).toFixed(4)) },
        presence: { minOpacity: Number(Math.min(...opacities).toFixed(3)), maxOpacity: Number(Math.max(...opacities).toFixed(3)) },
        settledWithinMs: Number(settledAt.toFixed(1)),
        restedForMs: Number((last.t - settledAt).toFixed(1)),
        endIsRest: Math.abs(last.scale - 1) < 0.004 && last.opacity > 0.79,
    };
}

async function shoot(page, file, clip) {
    await page.screenshot({ path: file, clip });
    return path.relative(OUT, file);
}

/** One sequence, one mode: setup, a **before** frame, start the sampler, act, then capture the frame
 * sequence while the sampler is still running.
 *
 * The before frame is the point of the pass: the acceptance question under reduced motion is not
 * "did it move" but "does the state change still read in a still", and that is a pixel comparison
 * between the state before the gesture and the state after it. */
async function capture(page, sequence, directory) {
    await sequence.setup(page);
    const before = decodePng(await page.screenshot({ path: path.join(directory, `${sequence.name}-before.png`), clip: sequence.clip }));
    const tracing = sample(page, sequence.trace.selector, sequence.trace.ms);
    const started = Date.now();
    await sequence.act(page);
    const frames = [];
    for (const [index, offset] of sequence.frames.entries()) {
        const wait = offset - (Date.now() - started);
        if (wait > 0)
            await page.waitForTimeout(wait);
        frames.push({ atMs: offset, file: await shoot(page, path.join(directory, `${sequence.name}-${index}.png`), sequence.clip) });
    }
    const series = await tracing;
    const last = decodePng(await readFile(path.join(OUT, frames[frames.length - 1].file)));
    return { series, frames, before: path.relative(OUT, path.join(directory, `${sequence.name}-before.png`)), stateChange: frameDelta(before, last) };
}

async function fieldMenu(page, command) {
    await page.getByTestId('field-title').click();
    const menu = page.getByTestId('field-menu');
    await menu.waitFor({ state: 'visible' });
    const direct = menu.locator(`[data-command="${command}"]`);
    if (await direct.count()) await direct.click();
    else {
        await menu.locator('[data-command="more"]').click();
        await page.getByTestId('field-more-menu').locator(`[data-command="${command}"]`).click();
    }
}

/* --- the atmosphere, measured over time -------------------------------------------------------- */

/** The background's own claim — "watching the Field for 5–10 seconds should let a person notice the
 * atmosphere is alive" — is a claim about *time*, so it is measured over time: the illumination
 * layer's transform is sampled at frame rate for 8 s, and two frames 6 s apart are compared pixel
 * by pixel. A flat plane would move by nothing in both measurements. */
async function captureAtmosphere(page, theme, directory) {
    // The theme is a device preference, and it has to be set before the app boots or the "dark"
    // frame is a light frame with a dark name.
    await page.addInitScript(settings => localStorage.setItem('diffusion-settings', JSON.stringify(settings)), { theme, locale: 'en' });
    await page.goto(`${BASE}/demo?locale=en`);
    await ready(page);
    const applied = await page.evaluate(() => document.documentElement.dataset.theme);
    if (applied !== theme)
        throw new Error(`theme ${theme} did not apply (document theme is ${applied})`);
    const declared = await page.locator('.atmosphere').evaluate(element => {
        const style = getComputedStyle(element, '::before');
        return { animationName: style.animationName, cycle: style.animationDuration, grainOpacity: Number(getComputedStyle(element.querySelector('.atmosphere-grain')).opacity) };
    });
    const series = await page.evaluate(() => new Promise(resolve => {
        const layer = document.querySelector('.atmosphere');
        const series = [];
        const start = performance.now();
        const read = () => {
            const matrix = new DOMMatrix(getComputedStyle(layer, '::before').transform);
            series.push({ t: Number((performance.now() - start).toFixed(1)), x: Number(matrix.e.toFixed(2)), y: Number(matrix.f.toFixed(2)) });
            if (performance.now() - start < 8000)
                requestAnimationFrame(read);
            else
                resolve(series);
        };
        requestAnimationFrame(read);
    }));
    // The measurement is the whole Field, because the eight sample patches below are spread across
    // it and must not fall outside a crop.
    const region = { ...full };
    const firstFile = path.join(directory, `atmosphere-${theme}-0ms.png`);
    const secondFile = path.join(directory, `atmosphere-${theme}-6000ms.png`);
    const first = decodePng(await page.screenshot({ path: firstFile, clip: region }));
    await page.waitForTimeout(6000);
    const second = decodePng(await page.screenshot({ path: secondFile, clip: region }));
    // The static-material claim is about the Field, not about the words on it: eight widely separated
    // patches that sit clear of every Thought and of the chrome, the same points the gated
    // `visual.spec.ts` measures. Luminance across those patches is the atmosphere's own variation.
    const patches = [[500, 140], [900, 140], [500, 360], [900, 360], [500, 580], [900, 580], [140, 480], [1300, 480]].map(([x, y]) => patchMean(first, x, y));
    const patchLuma = patches.map(patch => 0.2126 * patch.r + 0.7152 * patch.g + 0.0722 * patch.b);
    return {
        theme,
        declared,
        drift: {
            samples: series.length,
            offsetX: { min: Math.min(...series.map(entry => entry.x)), max: Math.max(...series.map(entry => entry.x)) },
            offsetY: { min: Math.min(...series.map(entry => entry.y)), max: Math.max(...series.map(entry => entry.y)) },
        },
        staticMaterial: {
            patchLuma: patchLuma.map(value => Number(value.toFixed(1))),
            patchSpread: Number((Math.max(...patchLuma) - Math.min(...patchLuma)).toFixed(2)),
            redMinusBlue: patches.map(patch => Number((patch.r - patch.b).toFixed(1))),
            regionLumaDeviation: regionStats(first, 0, 0, region.width, region.height).lumaDeviation,
        },
        changeOver6s: frameDelta(first, second),
        frames: [path.relative(OUT, firstFile), path.relative(OUT, secondFile)],
    };
}

/* --- main ------------------------------------------------------------------------------------- */

async function main() {
    const only = process.env.MOTION_ONLY ? new Set(process.env.MOTION_ONLY.split(',').map(name => name.trim())) : null;
    const sequences = only ? SEQUENCES.filter(sequence => only.has(sequence.name)) : SEQUENCES;
    const atmosphere = !only || only.has('atmosphere');
    const video = !process.env.MOTION_NO_VIDEO;
    const report = { generatedAt: new Date().toISOString(), base: BASE, viewport: VIEWPORT, modes: MODES, sequences: [], atmosphere: [] };
    const browser = await chromium.launch();
    try {
        for (const mode of MODES) {
            const directory = path.join(OUT, mode.id);
            await mkdir(directory, { recursive: true });
            const context = await browser.newContext({
                viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: mode.media,
                ...(video ? { recordVideo: { dir: path.join(OUT, '.tmp'), size: VIEWPORT } } : {}),
            });
            for (const sequence of sequences) {
                const page = await context.newPage();
                const recording = page.video();
                try {
                    const { series, frames, before, stateChange } = await capture(page, sequence, directory);
                    const metrics = summarise(series);
                    report.sequences.push({ mode: mode.id, name: sequence.name, what: sequence.what, before, frames, stateChange, metrics });
                    console.log(`  ${mode.id.padEnd(6)} ${sequence.name.padEnd(24)} painted ${JSON.stringify(metrics.travel)}  depth ${metrics.depth.minScale}..${metrics.depth.maxScale}  settled ${metrics.settledWithinMs ?? '-'}ms  before/after ${stateChange.meanDelta.toFixed(2)}/255 across ${(stateChange.movedShare * 100).toFixed(1)}% of pixels`);
                }
                catch (error) {
                    throw new Error(`sequence "${sequence.name}" failed in mode ${mode.id}: ${error instanceof Error ? error.message : String(error)}`);
                }
                finally {
                    await page.close();
                    if (recording)
                        await recording.saveAs(path.join(directory, `${sequence.name}.webm`)).catch(() => undefined);
                }
            }
            if (atmosphere) {
                for (const theme of ['light', 'dark']) {
                    const page = await context.newPage();
                    try {
                        const result = await captureAtmosphere(page, theme, directory);
                        report.atmosphere.push({ mode: mode.id, ...result });
                        console.log(`  ${mode.id.padEnd(6)} atmosphere-${theme.padEnd(5)} drift ${JSON.stringify(result.drift.offsetX)} / ${JSON.stringify(result.drift.offsetY)}  patch luma spread ${result.staticMaterial.patchSpread}  change over 6 s ${result.changeOver6s.meanDelta.toFixed(2)}/255 across ${(result.changeOver6s.movedShare * 100).toFixed(1)}% of pixels`);
                    }
                    finally {
                        await page.close();
                    }
                }
            }
            await context.close();
        }
    }
    finally {
        await browser.close();
    }
    await writeFile(path.join(OUT, 'motion-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\n${report.sequences.length} sequences and ${report.atmosphere.length} atmosphere measurements written to ${path.relative(ROOT, OUT)}/`);
}

await main();
