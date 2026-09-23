#!/usr/bin/env node
/**
 * Phase 2.5 visual acceptance — capture real Chromium screenshots of every state the pass
 * contradicts, in both themes and at two window sizes.
 *
 * It drives the *production bundle* (`dist/`) through `vite preview`, never the dev server, so a
 * still is what the gate actually serves. It is deliberately a separate, standalone script rather
 * than a Playwright test:
 *
 *   - it is not an assertion (nothing here can decide whether the product is good);
 *   - it must be re-runnable against any running preview without touching the e2e gate;
 *   - it produces artefacts (PNGs) rather than a pass/fail, and artefacts do not belong in a gate.
 *
 * Motion is captured with `prefers-reduced-motion: reduce`. A still frame cannot show motion
 * anyway, so the honest choice is the one that removes the race: reduced motion freezes the
 * atmosphere drift and every authored sequence at its resolved end state, so two runs produce the
 * same pixels. The material itself is unaffected (`atmosphere.css` keeps every layer; only the
 * drift animation stops), so the two atmosphere recipes are still what the stills show.
 *
 * Usage:
 *   npx vite preview --port 4188 --strictPort --host 127.0.0.1   # in another shell
 *   node scripts/capture-visual.mjs
 *
 * Environment:
 *   CAPTURE_BASE_URL  default http://127.0.0.1:4188
 *   CAPTURE_OUT       default verification/v0.4.2/screenshots
 *   CAPTURE_ONLY      comma-separated state names, for re-shooting one frame
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:4188';
const OUT = path.resolve(ROOT, process.env.CAPTURE_OUT ?? 'verification/v0.4.2/screenshots');

const THEMES = [['light', 'Paper Day'], ['dark', 'Graphite Night']];
const SIZES = [['wide', { width: 1440, height: 960 }], ['narrow', { width: 900, height: 700 }]];

/** One frame per state the pass has an opinion about. Each function starts from a fresh page and
 * must leave it in the state the file name promises; anything else is a bug in the capture. */
const STATES = [
    {
        name: 'empty-field',
        run: async page => { await page.goto(`${BASE}/?locale=en`); await fieldReady(page); },
    },
    {
        name: 'composer-idle',
        run: async page => { await demo(page); },
    },
    {
        name: 'composer-focused',
        run: async page => {
            await demo(page);
            await composerInput(page).focus();
            await attribute(page.getByTestId('speak'), 'data-state', 'focused');
            await settle(page);
        },
    },
    {
        name: 'composer-scoped',
        run: async page => {
            await demo(page);
            await selectTwo(page);
            await page.getByTestId('scope-continue').click();
            await attribute(page.getByTestId('speak'), 'data-state', 'scoped');
            await page.getByTestId('speak-scope').filter({ hasText: 'Thinking with 2 thoughts' }).waitFor({ state: 'visible' });
            await settle(page);
        },
    },
    {
        name: 'first-thought',
        run: async page => {
            await page.goto(`${BASE}/?locale=en`);
            await fieldReady(page);
            const input = composerInput(page);
            await input.click();
            await input.fill('The thing I keep not deciding.');
            await input.press('Enter');
            await page.locator('[data-thought-id]').first().waitFor({ state: 'visible' });
            await settle(page);
        },
    },
    {
        name: 'settings-ai',
        run: async page => { await demo(page); await settings(page, 'ai'); },
    },
    {
        name: 'settings-appearance',
        run: async page => { await demo(page); await settings(page, 'appearance'); },
    },
    {
        name: 'shortcut-remapping',
        run: async page => {
            await demo(page);
            await settings(page, 'shortcuts');
            await record(page, 'palette', 'Control+J');
            await attribute(row(page, 'palette'), 'data-overridden', 'true');
            await settle(page);
        },
    },
    {
        name: 'shortcut-conflict',
        run: async page => {
            await demo(page);
            await settings(page, 'shortcuts');
            await record(page, 'palette', 'Control+F');
            await attribute(row(page, 'palette'), 'data-conflict', 'true');
            await settle(page);
        },
    },
    {
        name: 'field-switch',
        run: async page => {
            await demo(page);
            await fieldMenu(page, 'open-field');
            await page.getByRole('dialog', { name: 'Open Field' }).waitFor({ state: 'visible' });
            await settle(page);
        },
    },
    {
        name: 'history',
        run: async page => {
            await demo(page);
            await fieldMenu(page, 'history');
            await page.getByRole('dialog', { name: 'How did this form?' }).waitFor({ state: 'visible' });
            await settle(page);
        },
    },
    {
        name: 'selection-scope',
        run: async page => {
            await demo(page);
            await selectTwo(page);
            await page.getByTestId('scope-hub').waitFor({ state: 'visible' });
            await settle(page);
        },
    },
    {
        name: 'help',
        run: async page => {
            await demo(page);
            await page.getByTestId('global-more').click();
            await page.getByRole('menuitem', { name: 'Help', exact: true }).click();
            await page.getByRole('dialog', { name: 'Help', exact: true }).waitFor({ state: 'visible' });
            await settle(page);
        },
    },
    {
        // Creation is now the Thought's own in-place material/typography arrival; no Field halo.
        name: 'local-creation',
        run: async page => {
            await demo(page);
            await page.evaluate(() => document.documentElement.setAttribute('data-motion-preview', 'normal'));
            await page.getByTestId('field').dblclick({ position: { x: 830, y: 120 } });
            await page.getByRole('textbox', { name: 'Edit thought' }).waitFor({ state: 'visible' });
            if (await page.locator('.field-emergence').count())
                throw new Error('the retired circular creation halo returned');
        },
    },
    {
        name: 'feedback',
        run: async page => {
            await demo(page);
            await fieldMenu(page, 'duplicate-field');
            await page.locator('.notice', { hasText: 'Field duplicated.' }).waitFor({ state: 'visible', timeout: 15_000 });
            await settle(page);
        },
    },
];

// --- small helpers -----------------------------------------------------------------------------

/** Waits for the Field's own root and the atmosphere, so no still is taken mid-boot. */
async function fieldReady(page) {
    await page.locator('[data-testid="field"]').waitFor({ state: 'visible' });
    await page.locator('.atmosphere').waitFor({ state: 'attached' });
}

async function demo(page) {
    await page.goto(`${BASE}/demo?locale=en`);
    await fieldReady(page);
    await page.locator('[data-thought-id="attention"]').waitFor({ state: 'visible' });
}

async function settle(page) {
    await page.waitForLoadState('networkidle');
    // A short, bounded paint beat: the glyphs come from system fonts, but a surface that just
    // mounted (Settings, History) still needs its own layout pass before the frame is honest.
    await page.waitForTimeout(160);
}

const composerInput = page => page.getByRole('textbox', { name: 'Speak', exact: true });

/** Asserts one attribute, the only shape this script needs: a state the file name promises.
 * (No test framework: a capture is not a test, and depending on one would couple it to the gate.) */
async function attribute(locator, name, value) {
    const actual = await locator.getAttribute(name);
    if (actual !== value)
        throw new Error(`expected ${name}="${value}", got "${actual}"`);
}

async function selectTwo(page) {
    await page.locator('[data-thought-id="attention"]').click();
    await page.locator('[data-thought-id="structure"]').click({ modifiers: ['Shift'] });
    await page.locator('[data-selected="true"]').nth(1).waitFor({ state: 'visible' });
}

/** Opens Settings (Control+Comma) and lands on one section. */
async function settings(page, section) {
    await page.keyboard.press('Control+Comma');
    const dialog = page.getByRole('dialog', { name: 'Field settings' });
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator(`.settings-nav button[data-section="${section}"]`).click();
    await dialog.locator(`[data-section="${section}"][aria-selected="true"]`).waitFor({ state: 'visible' });
    await settle(page);
}

const row = (page, command) => page.getByRole('dialog', { name: 'Field settings' }).locator(`#setting-shortcuts [data-command="${command}"]`);

/** Records a combination for one command, the way a person does: click the row, press the keys. */
async function record(page, command, keys) {
    await row(page, command).locator('.shortcut-row').click();
    await row(page, command).and(page.locator('[data-recording="true"]')).waitFor({ state: 'visible' });
    await page.keyboard.press(keys);
    await page.waitForTimeout(120);
}

/** Opens the Field menu (the title, not `···`) and clicks one row by command id. */
async function fieldMenu(page, command) {
    await page.getByTestId('field-title').click();
    const menu = page.getByTestId('field-menu');
    await menu.waitFor({ state: 'visible' });
    await menu.locator(`[data-command="${command}"]`).click();
}

// --- capture ------------------------------------------------------------------------------------

async function main() {
    const only = process.env.CAPTURE_ONLY ? new Set(process.env.CAPTURE_ONLY.split(',').map(name => name.trim())) : null;
    const states = STATES.filter(state => !only || only.has(state.name));
    if (!states.length)
        throw new Error(`CAPTURE_ONLY matched no state: ${[...only].join(', ')}`);
    await mkdir(OUT, { recursive: true });
    const browser = await chromium.launch();
    const written = [];
    try {
        for (const [theme, themeLabel] of THEMES) {
            for (const [sizeName, viewport] of SIZES) {
                const context = await browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 });
                await context.addInitScript(settings => localStorage.setItem('diffusion-settings', JSON.stringify(settings)), { theme, locale: 'en' });
                for (const state of states) {
                    const page = await context.newPage();
                    const name = `${theme}-${sizeName}-${state.name}.png`;
                    try {
                        await state.run(page);
                        await page.screenshot({ path: path.join(OUT, name) });
                        written.push(name);
                        console.log(`  ${name}   (${themeLabel}, ${viewport.width}\u00d7${viewport.height})`);
                    }
                    catch (error) {
                        throw new Error(`state "${state.name}" failed for ${theme}/${sizeName}: ${error instanceof Error ? error.message : String(error)}`);
                    }
                    finally {
                        await page.close();
                    }
                }
                await context.close();
            }
        }
    }
    finally {
        await browser.close();
    }
    console.log(`\n${written.length} screenshots written to ${path.relative(ROOT, OUT)}/`);
}

await main();
