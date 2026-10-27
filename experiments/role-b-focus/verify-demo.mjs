import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';
const directory = dirname(fileURLToPath(import.meta.url));
const output = resolve(directory, 'results');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.ROLE_B_CHROMIUM || 'D:/DiffusionWork/playwright-browsers/chromium-1243/chrome-win64/chrome.exe', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
    await page.goto(pathToFileURL(resolve(directory, 'focus-demo.html')).href);
    await page.getByText('展开详细说明与依据', { exact: true }).click();
    assert(await page.locator('details').getAttribute('open') !== null);
    await page.screenshot({ path: resolve(output, 'focus-wide.png'), fullPage: true });
    await page.getByRole('button', { name: '原文重点标记', exact: true }).click();
    assert.equal(await page.locator('mark').innerText(), '如果答案是否，你就会放弃这个方向');
    await page.screenshot({ path: resolve(output, 'focus-mark.png'), fullPage: true });
    await page.getByRole('button', { name: '阅读边栏', exact: true }).click();
    assert(await page.locator('aside').isVisible());
    await page.screenshot({ path: resolve(output, 'focus-rail.png'), fullPage: true });
    const views = [];
    for (const colorScheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme });
        await page.setViewportSize({ width: 390, height: 844 });
        for (const mode of ['结论＋关键条件', '原文重点标记', '阅读边栏']) {
            await page.getByRole('button', { name: mode, exact: true }).click();
            assert.equal(await page.getByRole('button', { name: mode, exact: true }).getAttribute('aria-pressed'), 'true');
            const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
            assert(fits, mode + ' overflows');
            views.push({ colorScheme, width: 390, mode, fits });
        }
        await page.screenshot({ path: resolve(output, 'focus-narrow-' + colorScheme + '.png'), fullPage: true });
    }
    assert.deepEqual(errors, []);
    await writeFile(resolve(output, 'browser.json'), JSON.stringify({ status: 'PASS', provenance: 'standalone authored proposal, not production or model acceptance', views, pageErrors: errors }, null, 2));
    console.log('PASS: three modes, disclosure, exact mark, six narrow theme states, no page errors.');
} finally { await browser.close(); }
