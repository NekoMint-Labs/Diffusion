import { test, expect } from '@playwright/test';
// @ts-expect-error JavaScript utility intentionally has no declaration file.
import { decodePng, frameDelta } from '../../scripts/lib/png.mjs';

test.setTimeout(120_000);

const DEV_URL = process.env.LAB_URL ?? 'http://127.0.0.1:5199';
test.use({ baseURL: DEV_URL, viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });

const errors: string[] = [];
test.beforeEach(async ({ page, request }) => {
    errors.length = 0;
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    let live = false;
    try {
        const response = await request.get('/dev/material-gallery');
        const body = response.ok() ? await response.text() : '';
        live = body.includes('/@vite/client') && body.includes('/src/main.tsx');
    } catch { live = false; }
    test.skip(!live, `Start the dev gallery at ${DEV_URL}`);
    await page.goto('/dev/material-gallery');
    await expect(page.locator('.material-gallery')).toBeVisible();
});
test.afterEach(() => expect(errors).toEqual([]));

const backgrounds = ['Paper Texture', 'Topography', 'Threads', 'Waves', 'Perlin Noise', 'Silk'];
const themes = ['Paper', 'Graphite'];

async function setRange(page: import('@playwright/test').Page, name: string, value: number) {
    await page.getByRole('slider', { name }).fill(String(value));
    await expect(page.getByRole('slider', { name })).toHaveValue(String(value));
}

test('all material and theme combinations render at high DPI', async ({ page }) => {
    for (const theme of themes) {
        await page.getByRole('button', { name: theme, exact: true }).click();
        for (const background of backgrounds) {
            await page.getByRole('button', { name: background, exact: true }).click();
            await expect(page.locator('.material-gallery-background canvas')).toBeVisible();
            await page.waitForTimeout(250);
            const canvas = page.locator('.material-gallery-background canvas').first();
            const size = await canvas.evaluate(node => {
                const target = node as HTMLCanvasElement;
                return { width: target.width, height: target.height };
            });
            expect(size.width).toBeGreaterThan(0);
            expect(size.height).toBeGreaterThan(0);
            expect(size.width * size.height).toBeLessThanOrEqual(1920 * 1920);
        }
    }
    await expect(page.locator('.material-gallery-thought')).toHaveCount(6);
    await expect(page.locator('.material-gallery-relations .relation')).toHaveCount(5);
});

test('Motion 0 is visually static for every candidate', async ({ page }) => {
    await setRange(page, 'Motion', 0);
    for (const background of backgrounds) {
        await page.getByRole('button', { name: background, exact: true }).click();
        await page.waitForTimeout(500);
        const before = await page.locator('.material-gallery-stage').screenshot();
        await page.waitForTimeout(500);
        const after = await page.locator('.material-gallery-stage').screenshot();
        const delta = frameDelta(decodePng(before), decodePng(after));
        expect(delta.meanDelta, `${background} changed with Motion 0`).toBeLessThan(.05);
        expect(delta.movedShare, `${background} moved visibly with Motion 0`).toBeLessThan(.002);
    }
});

test('normal motion, comparison controls, and zoomed layout remain usable', async ({ page }) => {
    await setRange(page, 'Motion', 35);
    await setRange(page, 'Background presence', 55);
    await setRange(page, 'Scale / density', 58);
    await page.getByRole('button', { name: 'Silk', exact: true }).click();
    await page.waitForTimeout(350);
    await page.evaluate(() => { document.documentElement.style.zoom = '1.25'; });
    await expect(page.locator('.material-gallery-controls')).toBeVisible();
    await expect(page.locator('.material-gallery-stage')).toBeVisible();
    const bounds = await page.locator('.material-gallery-stage').boundingBox();
    expect(bounds?.width).toBeGreaterThan(500);
    expect(bounds?.height).toBeGreaterThan(500);
});

test('OS reduced motion forces renderer motion to zero', async ({ page }) => {
    await setRange(page, 'Motion', 70);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.getByText('OS reduced motion is active; renderer motion is forced to 0.')).toBeVisible();
    await expect(page.locator('.material-gallery-meta')).toContainText('0% motion');
});
